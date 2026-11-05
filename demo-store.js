"use strict";

// A local demonstration, not a payment service or a shared booking database.
const DemoStore = (() => {
  const KEY = DEMO_KEY;
  const OWNER = DEMO_KEY + ":tab";
  const uuid = () =>
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  function owner() {
    let id = sessionStorage.getItem(OWNER);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(OWNER, id);
    }
    return id;
  }
  function nowParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: VENUE_DATA.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
  }
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { holds: [], bookings: [], checkedIn: [] };
    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      throw Error(
        "Saved demo data is unreadable. Use Reset demo to start again.",
      );
    }
    if (
      !Array.isArray(state.holds) ||
      !Array.isArray(state.bookings) ||
      !Array.isArray(state.checkedIn)
    )
      throw Error(
        "Saved demo data has an unsupported format. Reset the demo to continue.",
      );
    state.holds = state.holds.filter((h) => Date.parse(h.expires) > Date.now());
    return state;
  }
  function write(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  const court = (id) => {
    const c = VENUE_DATA.courts.find((c) => c.id === id);
    if (!c) throw Error("Court not found.");
    return c;
  };
  const same = (a, b) =>
    a.court === b.court && a.date === b.date && a.hour === b.hour;
  const sameTime = (a, b) => a.date === b.date && a.hour === b.hour;
  function status(slot, state) {
    const now = nowParts();
    if (
      slot.date < now.date ||
      (slot.date === now.date && slot.hour <= now.hour) ||
      slot.hour === 12
    )
      return "unavailable";
    if (
      slot.hour === 17 ||
      state.bookings.some((r) => r.slots.some((s) => same(s, slot)))
    )
      return "booked";
    if (
      slot.hour === 19 ||
      state.holds.some(
        (h) => h.owner !== owner() && h.slots.some((s) => same(s, slot)),
      )
    )
      return "held";
    return "available";
  }
  function lastDate(today) {
    const max = new Date(today + "T12:00:00Z");
    max.setUTCDate(max.getUTCDate() + 60);
    return max.toISOString().slice(0, 10);
  }
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
      throw Error("Choose a valid date.");
    const parsed = new Date(date + "T12:00:00Z");
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    )
      throw Error("Choose a valid date.");
    const today = nowParts().date;
    if (date < today || date > lastDate(today))
      throw Error("Choose a date within the next 60 days.");
  }
  function hold(input, state) {
    if (
      !input ||
      !Array.isArray(input.slots) ||
      input.slots.length < 1 ||
      input.slots.length > 12
    )
      throw Error("Choose between 1 and 12 hourly slots.");
    const slots = input.slots.map((s) => {
      const [open, close] = court(s?.court).hours || VENUE_DATA.hours;
      if (!Number.isInteger(s.hour) || s.hour < open || s.hour >= close)
        throw Error("Choose a valid hourly slot.");
      validDate(s.date);
      return { court: s.court, date: s.date, hour: s.hour };
    });
    if (
      new Set(slots.map((s) => `${s.court}|${s.date}|${s.hour}`)).size !==
      slots.length
    )
      throw Error("Remove duplicate slots.");
    if (new Set(slots.map((s) => court(s.court).sport)).size !== 1)
      throw Error("Choose one sport per reservation.");
    if (!VENUE_DATA.allowMultipleCourts && new Set(slots.map((s) => s.court)).size > 1)
      throw Error("Choose one court per reservation.");
    if (slots.some((s) => status(s, state) !== "available"))
      throw Error(
        "A slot is no longer available in this browser. Choose another time.",
      );
    let total = slots.reduce((n, s) => n + court(s.court).rate, 0);
    const equipment = {};
    const sport = court(slots[0].court).sport;
    for (const [id, quantity] of Object.entries(input.equipment || {})) {
      if (quantity === 0) continue;
      const item = VENUE_DATA.equipment.find((e) => e.id === id);
      if (
        !item || !supportsSport(item, sport) ||
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        quantity > item.stock
      )
        throw Error("Check your equipment quantities.");
      for (const slot of slots) {
        const reserved = state.bookings
          .filter((r) => r.slots.some((s) => sameTime(s, slot)))
          .reduce((n, r) => n + (r.equipment[id] || 0), 0);
        const held = state.holds
          .filter(
            (h) =>
              h.owner !== owner() && h.slots.some((s) => sameTime(s, slot)),
          )
          .reduce((n, h) => n + (h.equipment[id] || 0), 0);
        if (reserved + held + quantity > item.stock)
          throw Error(
            "Some equipment is unavailable for that time. Reduce the quantity.",
          );
      }
      equipment[id] = quantity;
      total += quantity * item.price;
    }
    state.holds = state.holds.filter((h) => h.owner !== owner());
    const h = {
      id: uuid(),
      owner: owner(),
      slots,
      equipment,
      total,
      expires: new Date(Date.now() + 300000).toISOString(),
    };
    state.holds.push(h);
    write(state);
    return h;
  }
  function confirm(data, state) {
    const existing = state.bookings.find(
      (r) => r.holdId === data.holdId && r.owner === owner(),
    );
    if (existing) return existing;
    const h = state.holds.find(
      (h) => h.id === data.holdId && h.owner === owner(),
    );
    if (!h)
      throw Error("Your hold expired. Return to Review to create a new hold.");
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "") ||
      data.email.length > 180
    )
      throw Error("Enter a valid sample email.");
    const capacity = Math.min(
      24,
      [...new Set(h.slots.map((s) => s.court))].reduce(
        (n, id) => n + court(id).capacity,
        0,
      ),
    );
    if (
      !Array.isArray(data.players) ||
      !data.players.length ||
      data.players.length > capacity ||
      data.players.some(
        (p) =>
          !p ||
          typeof p.name !== "string" ||
          !p.name.trim() ||
          p.name.length > 80,
      )
    )
      throw Error(`Enter player names for up to ${capacity} players.`);
    if (data.payment !== "full" && !(data.payment === "deposit" && VENUE_DATA.allowDeposit))
      throw Error("Choose a demo payment option.");
    const r = {
      id: `BW-${uuid().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
      holdId: h.id,
      owner: owner(),
      slots: h.slots,
      equipment: h.equipment,
      total: h.total,
      paid: data.payment === "deposit" ? depositAmount(h.total) : h.total,
      payment: data.payment,
      email: data.email.trim(),
      passes: data.players.map((p) => ({ token: uuid(), name: p.name.trim() })),
    };
    state.bookings.push(r);
    state.holds = state.holds.filter((x) => x.id !== h.id);
    write(state);
    return r;
  }
  async function execute(route, data) {
    const url = new URL(route, "https://local.demo");
    if (url.pathname === "/catalog")
      return { ...VENUE_DATA, today: nowParts().date, lastDate: lastDate(nowParts().date) };
    const state = read();
    if (url.pathname === "/availability") {
      const id = url.searchParams.get("court"),
        date = url.searchParams.get("date");
      const [open, close] = court(id).hours || VENUE_DATA.hours;
      validDate(date);
      return Array.from({ length: close - open }, (_, i) => ({
        hour: i + open,
        status: status({ court: id, date, hour: i + open }, state),
      }));
    }
    if (url.pathname === "/passes") return { bookings: state.bookings };
    if (url.pathname === "/recover")
      return {
        holds: state.holds.filter((h) => h.owner === owner()),
        bookings: state.bookings.filter((r) => r.owner === owner()),
      };
    if (url.pathname === "/holds" && data) return hold(data, state);
    if (url.pathname === "/bookings" && data) return confirm(data, state);
    if (url.pathname.startsWith("/bookings/")) {
      const r = state.bookings.find(
        (r) =>
          r.id === decodeURIComponent(url.pathname.split("/").pop()) &&
          r.owner === owner(),
      );
      if (!r)
        throw Error(
          "This reservation is not saved in this browser tab. Use the original booking tab.",
        );
      return r;
    }
    if (url.pathname.startsWith("/check-in/")) {
      const token = url.pathname.split("/").pop();
      if (
        !state.bookings.some(
          (r) => r.passes.some((p) => p.token === token),
        )
      )
        throw Error("Pass not found in this browser.");
      if (state.checkedIn.includes(token))
        throw Error("This player has already checked in.");
      state.checkedIn.push(token);
      write(state);
      return { message: "Checked in. Enjoy your game." };
    }
    throw Error("This demonstration action is unavailable.");
  }
  async function request(route, data) {
    // Web Locks serializes mutations across same-origin tabs where supported.
    if (data && globalThis.navigator?.locks?.request)
      return navigator.locks.request(KEY, () => execute(route, data));
    return execute(route, data);
  }
  function qr(token) {
    const url = new URL(location.href);
    url.hash = `/pass/${token}`;
    const image = qrcode(0, "M");
    image.addData(url.href);
    image.make();
    return image.createDataURL(5, 12);
  }
  function reset() {
    const clear = () => {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(DRAFT_KEY);
    };
    return navigator.locks?.request ? navigator.locks.request(KEY, clear) : clear();
  }
  return { request, qr, reset };
})();
