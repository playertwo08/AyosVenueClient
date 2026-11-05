"use strict";
const initialState = () => ({
  step: 0,
  sport: "Pickleball",
  date: "",
  court: "",
  slots: [],
  equipment: {},
  players: [""],
  email: "",
  payment: "full",
  hold: null,
});
let state = initialState();
function keepCompatibleRentals(sport) {
  for (const item of catalog.equipment) {
    if (!supportsSport(item, sport)) delete state.equipment[item.id];
  }
}
function resetBooking() { state = initialState(); }
const steps = [
  "Sport",
  "Date",
  "Court",
  "Time",
  "More play",
  "Players",
  "Equipment",
  "Review",
  "Payment",
];
function save() {
  const { players, email, hold, ...safe } = state;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
}
function courtTotal() {
  return state.slots.reduce(
      (n, s) => n + catalog.courts.find((c) => c.id === s.court).rate,
      0,
    );
}
function total() {
  return courtTotal() + catalog.equipment.reduce(
      (n, e) => n + (state.equipment[e.id] || 0) * e.price,
      0,
    );
}
function summary(removable = true) {
  return `<h3>Your game plan.</h3>${state.slots.length ? state.slots.map((s, i) => `<div class="summary-row"><span>${esc(catalog.courts.find((c) => c.id === s.court).name)}<br><small>${dateLabel(s.date)} · ${time(s.hour)}</small></span><span>${money(catalog.courts.find((c) => c.id === s.court).rate)}${removable ? `<button class="chip" data-remove="${i}" aria-label="Remove ${time(s.hour)} on ${dateLabel(s.date)}">×</button>` : ""}</span></div>`).join("") : "<p>Your selected courts and times will appear here.</p>"}${catalog.equipment
    .filter((e) => state.equipment[e.id] > 0)
    .map(
      (e) =>
        `<div class="summary-row"><span>${e.name} × ${state.equipment[e.id]}</span><span>${money(e.price * state.equipment[e.id])}</span></div>`,
    )
    .join(
      "",
    )}<div class="summary-row"><span>Court subtotal</span><span>${money(courtTotal())}</span></div><div class="summary-row"><span>Rental subtotal</span><span>${money(total() - courtTotal())}</span></div><div class="total"><span>Total</span><strong>${money(total())}</strong></div><p class="note">Sample ${esc(catalog.currency)} pricing · no extra fees.<br>Equipment is charged per reservation.</p>${state.hold ? `<p class="note">Hold expires at ${new Date(state.hold.expires).toLocaleTimeString("en-PH", { timeZone: catalog.timezone, hour: "2-digit", minute: "2-digit" })} ${esc(catalog.timezoneLabel)}.</p>` : ""}`;
}
async function booking(isCurrent) {
  resetBooking();
  if (!catalog.courts.length) throw Error("No courts are currently available to book.");
  const draft = sessionStorage.getItem(DRAFT_KEY);
  if (draft) {
    try {
      const d = JSON.parse(draft);
      state = { ...state, ...d, step: 0, hold: null };
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }
  if (!state.date || state.date < catalog.today || state.date > catalog.lastDate) state.date = catalog.today;
  const savedCourt = findCourt(state.court);
  state.slots = state.slots.filter((slot) => findCourt(slot.court)?.sport === savedCourt?.sport && slot.date >= catalog.today);
  const first = catalog.courts.find((court) => court.sport === "Pickleball") || catalog.courts[0];
  state.court = (savedCourt || first).id;
  state.sport = (savedCourt || first).sport;
  state.step = sports().length === 1 ? 1 : 0;
  const q = query();
  const requested = findCourt(q.get("court"));
  if (q.has("court")) {
    const c = requested || first;
    if (c) {
      if (c.sport !== state.sport) {
        state.slots = [];
        keepCompatibleRentals(c.sport);
      }
      if (!catalog.allowMultipleCourts) state.slots = state.slots.filter((slot) => slot.court === c.id);
      state.court = c.id;
      state.sport = c.sport;
    }
  }
  if (
    q.has("equipment") &&
    catalog.equipment.some((e) => e.id === q.get("equipment") && supportsSport(e, state.sport))
  )
    state.equipment[q.get("equipment")] = 1;
  main.innerHTML =
    head(
      "YOUR NEXT GREAT GAME",
      "Make time to play.",
      "Demo booking. Use sample player details. Payments and check-ins are simulated.",
    ) +
    `<section class="section wrap">${q.has("court") && !requested ? `<p class="note">That court is unavailable. Start with ${esc(first.name)} or choose another court.</p>` : ""}<div id="recovery"></div><div class="booking-layout"><div class="booking-main"><div class="progress" aria-label="Booking progress"></div><div id="step"></div><div id="booking-error" role="alert"></div><div class="booking-actions"><button class="button secondary" id="back">← Back</button><button class="button" id="continue">Continue →</button></div></div><aside class="booking-side" aria-label="Booking summary" aria-live="polite"></aside></div></section>`;
  try {
    const r = await demo("/recover");
    if (!isCurrent()) return;
    const latest = r.bookings.at(-1);
    if (latest)
      document.querySelector("#recovery").innerHTML =
        `<p class="note">Your last confirmed game: <a class="text-link" href="/confirmation/${latest.id}">${latest.id} ↗</a></p>`;
    if (r.holds.length) {
      document.querySelector("#recovery").innerHTML +=
        `<div class="mockup" style="margin-bottom:24px">A pending reservation is held in this browser. <button class="chip" id="resume">Resume reservation</button></div>`;
      document.querySelector("#resume").onclick = async () => {
        const h = r.holds[0];
        state.slots = h.slots;
        state.equipment = h.equipment;
        state.hold = h;
        state.sport = catalog.courts.find(
          (c) => c.id === h.slots[0].court,
        ).sport;
        state.court = h.slots[0].court;
        state.date = h.slots[0].date;
        state.step = 5;
        await renderStep();
        document.querySelector("#step h2")?.focus();
      };
    }
  } catch (e) {
    toast(e.message);
  }
  if (!isCurrent()) return;
  document.querySelector("#back").onclick = () => {
    if (state.step > (sports().length === 1 ? 1 : 0)) {
      capture();
      state.step--;
      renderStep();
    }
  };
  document.querySelector("#continue").onclick = next;
  await renderStep();
}
function capture() {
  if (state.step === 6) {
    document.querySelectorAll("[data-equipment]").forEach((x) => {
      state.equipment[x.dataset.equipment] = Number(x.value);
    });
  }
  if (state.step === 5) {
    state.players = [...document.querySelectorAll("[data-player]")].map((x) =>
      x.value.trim(),
    );
    state.email = document.querySelector("#email").value.trim();
  }
  if (state.step === 8)
    state.payment =
      document.querySelector("input[name=payment]:checked")?.value || "full";
}
async function renderStep() {
  save();
  const firstStep = sports().length === 1 ? 1 : 0;
  document.querySelector(".progress").innerHTML = steps
    .slice(firstStep)
    .map(
      (s, i) =>
        `<span class="${state.step === i + firstStep ? "active" : ""}" ${state.step === i + firstStep ? 'aria-current="step"' : ""}>${String(i + 1).padStart(2, "0")} ${s}</span>`,
    )
    .join("");
  document.querySelector("#booking-error").innerHTML = "";
  document.querySelector("#back").disabled = state.step === firstStep;
  document.querySelector("#continue").textContent =
    state.step === 8 ? "Confirm demo payment →" : "Continue →";
  document.querySelector(".booking-side").innerHTML = summary();
  bindRemove();
  const el = document.querySelector("#step");
  const active = document.activeElement;
  const control = active?.closest("#step button");
  const selector = control && [...control.attributes].find((attr) => attr.name.startsWith("data-"));
  const headings = [
    ["What’s your game?", "Choose one sport for this reservation."],
    [
      "Pick your day.",
      "Plan ahead. Demo reservations are available for the next 60 days.",
    ],
    ["Find your court.", "Pick a space that fits your game."],
    ["Choose your time.", "Tap one or more available hourly slots."],
    ["One more game?", "Add another court or time to the same reservation."],
    [
      "Who’s playing?",
      "Every player gets their own pass. Include the booking contact as a player.",
    ],
    [
      "Travel light.",
      "Add equipment for your group, or continue without rentals.",
    ],
    [
      "Your game, at a glance.",
      "Review everything before we hold your courts for five minutes.",
    ],
    ["One last step.", "This is a sandbox payment. No money is charged."],
  ];
  el.innerHTML = `<h2 tabindex="-1">${headings[state.step][0]}</h2><p>${headings[state.step][1]}</p>`;
  if (state.step === 0) {
    el.innerHTML += `<div class="choice-grid">${sports()
      .map(
        (s) =>
          `<button class="choice ${s === state.sport ? "selected" : ""}" data-choose-sport="${s}" aria-pressed="${s === state.sport}"><strong>${s}</strong><small>${catalog.courts.filter((c) => c.sport === s).length} concept court(s) ↗</small></button>`,
      )
      .join("")}</div>`;
    document.querySelectorAll("[data-choose-sport]").forEach(
      (b) =>
        (b.onclick = () => {
          if (state.sport !== b.dataset.chooseSport) {
            state.slots = [];
            keepCompatibleRentals(b.dataset.chooseSport);
            state.hold = null;
            state.sport = b.dataset.chooseSport;
            state.court = catalog.courts.find(
              (c) => c.sport === state.sport,
            ).id;
          }
          renderStep();
        }),
    );
  }
  if (state.step === 1) {
    el.innerHTML += `<div class="field"><label for="booking-date">Booking date · ${esc(catalog.timezoneLabel)}</label><input id="booking-date" type="date" required min="${catalog.today}" max="${catalog.lastDate}" value="${state.date}"></div><p class="note">Slots are one hour. Court hours appear on each court page.</p>`;
    document.querySelector("#booking-date").onchange = (e) => {
      state.date = e.target.value;
      save();
    };
  }
  if (state.step === 2) {
    el.innerHTML += `<div class="choice-grid">${catalog.courts
      .filter((c) => c.sport === state.sport && (catalog.allowMultipleCourts || !state.slots.length || state.slots[0].court === c.id))
      .map(
        (c) =>
          `<button class="choice ${state.court === c.id ? "selected" : ""}" data-court="${c.id}" aria-pressed="${state.court === c.id}">${photo(c.image, c.alt)}<strong>${c.name}</strong><small>${money(c.rate)} / hour · ${c.capacity} players</small></button>`,
      )
      .join("")}</div>`;
    document.querySelectorAll("[data-court]").forEach(
      (b) =>
        (b.onclick = () => {
          state.court = b.dataset.court;
          renderStep();
        }),
    );
  }
  if (state.step === 3) {
    el.innerHTML += `<p>${esc(catalog.courts.find((c) => c.id === state.court).name)} · ${dateLabel(state.date)}</p><div class="legend"><span>□ Available</span><span>■ Selected</span><span>▧ Booked</span><span>— Unavailable</span><span>┄ Temporarily held</span></div><div id="time-slots" class="slots"><div class="skeleton"></div></div><p class="note">Sample unavailable period: 12 PM. Booked: 5 PM. Temporary hold example: 7 PM. Updates every 10 seconds. Checkout revalidates availability before creating your hold.</p>`;
    try {
      const slots = await demo(
        `/availability?court=${encodeURIComponent(state.court)}&date=${state.date}`,
      );
      if (!el.isConnected || !el.querySelector("#time-slots")) return;
      el.querySelector("#time-slots").innerHTML = slots
        .map((s) => {
          const selected = state.slots.some(
            (x) =>
              x.court === state.court &&
              x.date === state.date &&
              x.hour === s.hour,
          );
          return `<button class="slot ${selected ? "selected" : s.status}" data-hour="${s.hour}" ${s.status !== "available" ? "disabled" : ""} aria-pressed="${selected}">${time(s.hour)}<small>${selected ? "Selected" : s.status}</small></button>`;
        })
        .join("");
      document.querySelectorAll("[data-hour]").forEach(
        (b) =>
          (b.onclick = () => {
            const h = Number(b.dataset.hour),
              i = state.slots.findIndex(
                (s) =>
                  s.court === state.court &&
                  s.date === state.date &&
                  s.hour === h,
              );
            if (i >= 0) state.slots.splice(i, 1);
            else if (state.slots.length < 12)
              state.slots.push({
                court: state.court,
                date: state.date,
                hour: h,
              });
            else toast("Up to 12 slots per reservation.");
            state.hold = null;
            renderStep();
          }),
      );
    } catch (e) {
      if (el.isConnected) showError(e.message);
    }
  }
  if (state.step === 4) {
    el.innerHTML += `<div class="mockup"><h3>${state.slots.length} hour${state.slots.length === 1 ? "" : "s"} selected.</h3><p style="margin:16px 0">Add another time${catalog.allowMultipleCourts ? " or court" : ""}, or continue to your players.</p><button class="button secondary" id="add-more">Add court or time +</button></div>`;
    document.querySelector("#add-more").onclick = () => {
      state.step = 1;
      renderStep();
    };
  }
  if (state.step === 5) {
    const cap = Math.min(
      24,
      [...new Set(state.slots.map((s) => s.court))].reduce(
        (n, c) => n + catalog.courts.find((x) => x.id === c).capacity,
        0,
      ),
    );
    el.innerHTML += `<form id="players-form"><div class="field"><label for="email">Booking contact email</label><input id="email" type="email" required maxlength="180" autocomplete="email" value="${esc(state.email)}"></div>${state.players.map((n, i) => `<div class="field"><label for="player-${i}">Player ${i + 1}${i === 0 ? " · booking contact" : ""}</label><div style="display:flex;gap:8px"><input id="player-${i}" data-player type="text" required maxlength="80" value="${esc(n)}" autocomplete="${i === 0 ? "name" : "off"}">${i > 0 ? `<button class="chip" type="button" data-delete-player="${i}" aria-label="Remove player ${i + 1}">×</button>` : ""}</div></div>`).join("")}<button class="button secondary" type="button" id="add-player" ${state.players.length >= cap ? "disabled" : ""}>Add player +</button><p class="note">Up to ${cap} players for your selected courts. Use sample details. Confirmed passes are saved locally; unfinished player details are not included in drafts.</p></form>`;
    document.querySelector("#players-form").onsubmit = (e) => {
      e.preventDefault();
      next();
    };
    document.querySelector("#add-player").onclick = () => {
      capture();
      state.players.push("");
      renderStep();
    };
    document.querySelectorAll("[data-delete-player]").forEach(
      (b) =>
        (b.onclick = () => {
          capture();
          state.players.splice(Number(b.dataset.deletePlayer), 1);
          renderStep();
        }),
    );
  }
  if (state.step === 6) {
    el.innerHTML += catalog.equipment
      .filter((e) => supportsSport(e, state.sport))
      .map(
        (e) =>
          `<div class="rental-row"><div><h3>${e.name}</h3><p>${money(e.price)} / reservation · ${e.stock} demo units</p></div><div><label class="fine" for="qty-${e.id}">Quantity</label><input id="qty-${e.id}" data-equipment="${e.id}" type="number" min="0" max="${e.stock}" value="${state.equipment[e.id] || 0}"></div></div>`,
      )
      .join("") || "<p>No rentals are offered for this sport.</p>";
    document.querySelectorAll("[data-equipment]").forEach(
      (x) =>
        (x.oninput = () => {
          state.equipment[x.dataset.equipment] = Number(x.value);
          state.hold = null;
          save();
          document.querySelector(".booking-side").innerHTML = summary();
          bindRemove();
        }),
    );
  }
  if (state.step === 7) {
    el.innerHTML += `<div class="mockup">${summary(false)}<div class="summary-row"><span>Players</span><span>${state.players.map(esc).join(", ")}</span></div><div class="summary-row"><span>Contact</span><span>${esc(state.email)}</span></div></div><p class="note">Continue to create a five-minute temporary hold. Demo reservations are saved in this browser. Use sample player details only.</p>`;
  }
  if (state.step === 8) {
    el.innerHTML += `<div class="mockup"><span class="eyebrow">DEMO PAYMENT · NO REAL CHARGE</span><h3>Choose how to reserve.</h3><label class="choice" style="display:block;margin-top:24px"><input style="width:20px;min-height:20px" type="radio" name="payment" value="full" ${state.payment === "full" ? "checked" : ""}> Full demo payment · ${money(state.hold?.total || total())}</label>${catalog.allowDeposit ? `<label class="choice" style="display:block;margin-top:16px"><input style="width:20px;min-height:20px" type="radio" name="payment" value="deposit" ${state.payment === "deposit" ? "checked" : ""}> 50% demo deposit · ${money(depositAmount(state.hold?.total || total()))}</label>` : ""}<p class="note">No card or wallet information is collected. A simulated payment confirms this reservation. The confirmation and passes appear in this browser.</p></div>`;
  }
  if (selector) el.querySelector(`[${selector.name}="${CSS.escape(selector.value)}"]`)?.focus({ preventScroll: true });
  else if (control?.id) el.querySelector(`#${control.id}`)?.focus({ preventScroll: true });
}
function bindRemove() {
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        capture();
        state.slots.splice(Number(b.dataset.remove), 1);
        state.hold = null;
        if (state.step > 3) state.step = 3;
        renderStep();
      }),
  );
}
function showError(message) {
  const error = document.querySelector("#booking-error");
  if (error) error.innerHTML = `<p class="error">${esc(message)}</p>`;
}
async function next() {
  capture();
  const b = document.querySelector("#continue");
  if (b.disabled) return;
  try {
    if (state.step === 1) {
      const d = document.querySelector("#booking-date");
      if (!d.reportValidity()) return;
      state.date = d.value;
    }
    if (state.step === 3 && state.slots.length === 0)
      throw Error("Choose at least one available time slot.");
    if (state.step === 4 && state.slots.length === 0)
      throw Error("Add a court and time first.");
    if (
      state.step === 5 &&
      !document.querySelector("#players-form").reportValidity()
    )
      return;
    if (state.step === 6) {
      for (const x of document.querySelectorAll("[data-equipment]"))
        if (!x.reportValidity()) return;
    }
    b.disabled = true;
    b.textContent = "Please wait…";
    if (state.step === 7) {
      const hold = await demo("/holds", { slots: state.slots, equipment: state.equipment });
      if (!b.isConnected) return;
      state.hold = hold;
    }
    if (state.step === 8) {
      if (!state.hold)
        throw Error("Review your reservation again to create a new hold.");
      const r = await demo("/bookings", {
        holdId: state.hold.id,
        email: state.email,
        players: state.players.map((name) => ({ name })),
        payment: state.payment,
      });
      if (!b.isConnected) return;
      sessionStorage.removeItem(DRAFT_KEY);
      location.hash = "/confirmation/" + r.id;
      return;
    }
    state.step++;
    await renderStep();
    if (b.isConnected) document.querySelector("#step h2").focus();
  } catch (e) {
    if (b.isConnected) {
      if (state.step === 8 && Date.parse(state.hold?.expires) <= Date.now()) {
        state.hold = null;
        state.step = 7;
        await renderStep();
      }
      showError(e.message);
    }
  } finally {
    b.disabled = false;
    b.textContent = state.step === 8 ? "Confirm demo payment →" : "Continue →";
  }
}
async function confirmation(isCurrent) {
  const r = await demo(
    "/bookings/" + encodeURIComponent(path.split("/").pop()),
  );
  if (!isCurrent()) return;
  main.innerHTML =
    head(
      "BOOKING CONFIRMED · SANDBOX",
      "You’re on the court.",
      "Your demo reservation is confirmed. No email was sent; your passes are available below.",
      button("Print your passes", "#", true),
    ) +
    `<section class="section wrap"><div class="split"><div><span class="eyebrow">${r.id}</span><h2>${esc(catalog.venue)}</h2><p>${r.slots.map((s) => `${esc(catalog.courts.find((c) => c.id === s.court).name)} · ${dateLabel(s.date)} · ${time(s.hour)} – ${time(s.hour + 1)}`).join("<br>")}</p><p>${r.passes.length} player(s) · ${esc(r.email)}</p><p>${
      catalog.equipment
        .filter((e) => r.equipment[e.id] > 0)
        .map((e) => `${e.name} × ${r.equipment[e.id]}`)
        .join(", ") || "No rental equipment"
    }</p></div><div class="mockup"><span class="eyebrow">DEMO PAYMENT CONFIRMED</span><div class="summary-row"><span>Reservation total</span><span>${money(r.total)}</span></div><div class="summary-row"><span>${r.payment === "deposit" ? "50% demo deposit" : "Full demo payment"}</span><span>${money(r.paid)}</span></div><div class="summary-row"><span>Demo balance</span><span>${money(r.total - r.paid)}</span></div><p class="note">No money has moved. This booking exists only in the running sandbox.</p></div></div><div style="margin-top:64px"><span class="eyebrow">ONE PLAYER. ONE PASS.</span><h2>Your player passes.</h2><p style="margin-top:24px">Open the pass in this browser, or try the check-in demonstration. Each pass can be checked in only once.</p><div class="pass-grid">${r.passes.map((p) => passCard(p, r)).join("")}</div></div><p class="note">QR codes contain a unique pass URL. Passes and check-in records are stored in this browser. Scanning on a different device does not transfer reservation data.</p></section>`;
  document.querySelector('a[href="#"]').onclick = (e) => {
    e.preventDefault();
    window.print();
  };
  bindCheckin();
}
function passCard(p, r) {
  return `<article class="pass"><div class="pass-top"><span class="eyebrow">${esc(catalog.venue)} · Digital player pass</span><h3>${esc(p.name)}</h3><p style="color:#ddd">${r.id}</p></div><div class="pass-body"><p>${r.slots.map((s) => `${esc(catalog.courts.find((c) => c.id === s.court).name)}<br>${dateLabel(s.date)} · ${time(s.hour)}`).join("<br>")}</p><img src="${DemoStore.qr(p.token)}" alt="QR player pass for ${esc(p.name)}" width="256" height="256"><a class="text-link" href="#/pass/${p.token}">Open pass ↗</a><button class="button secondary" data-checkin="${p.token}">Try demo check-in ↗</button><div data-checkin-status="${p.token}" role="status"></div></div><div class="pass-footer"><span>DEMO PASS</span><span>AYOS Venue ↗</span></div></article>`;
}
function bindCheckin() {
  document.querySelectorAll("[data-checkin]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        const out = document.querySelector(
          `[data-checkin-status="${b.dataset.checkin}"]`,
        );
        try {
          const r = await demo("/check-in/" + b.dataset.checkin, {});
          out.textContent = r.message;
          b.textContent = "Checked in ✓";
        } catch (e) {
          out.textContent = e.message;
          b.disabled = false;
        }
      }),
  );
}
async function passPage(isCurrent) {
  const recovery = await demo("/passes"),
    token = path.split("/").pop();
  if (!isCurrent()) return;
  let found;
  for (const r of recovery.bookings) {
    const p = r.passes.find((p) => p.token === token);
    if (p) found = { p, r };
  }
  if (!found)
    throw Error(
      "This demo pass is not saved in this browser. Open it on the browser used for the reservation.",
    );
  main.innerHTML =
    head("YOUR DIGITAL PLAYER PASS", "Ready for game time.") +
    `<section class="section wrap"><div class="pass-grid">${passCard(found.p, found.r)}</div></section>`;
  bindCheckin();
}
// The demonstration polls only the schedule currently being viewed.
setInterval(async () => {
  if (
    document.hidden ||
    state.step !== 3 ||
    !document.querySelector("#time-slots")
  )
    return;
  const viewedCourt = state.court,
    viewedDate = state.date;
  try {
    const slots = await demo(
      `/availability?court=${encodeURIComponent(viewedCourt)}&date=${viewedDate}`,
    );
    if (
      state.step !== 3 ||
      state.court !== viewedCourt ||
      state.date !== viewedDate
    )
      return;
    for (const slot of slots) {
      const element = document.querySelector(`[data-hour="${slot.hour}"]`);
      if (!element) continue;
      const selected = state.slots.some(
        (s) =>
          s.court === viewedCourt &&
          s.date === viewedDate &&
          s.hour === slot.hour,
      );
      element.disabled = slot.status !== "available";
      element.className = `slot ${selected ? "selected" : slot.status}`;
      element.querySelector("small").textContent = selected
        ? slot.status === "available"
          ? "Selected"
          : `Selected · ${slot.status}`
        : slot.status;
    }
  } catch (error) {
    if (!document.querySelector("#time-slots")) return;
    showError(
      "Availability could not refresh. Your selections are preserved. " +
        error.message,
    );
  }
}, 10000);
