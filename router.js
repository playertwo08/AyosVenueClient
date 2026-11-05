"use strict";

const menu = document.querySelector("#mobile-menu");
const toggle = document.querySelector(".menu-toggle");
function setMenu(open) {
  menu.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}
toggle.onclick = () => setMenu(menu.hidden);
matchMedia("(min-width: 901px)").addEventListener("change", () => setMenu(false));
menu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setMenu(false);
    main.focus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !menu.hidden) {
    setMenu(false);
    toggle.focus();
  }
});
document.querySelector(".skip").onclick = (event) => {
  event.preventDefault();
  main.focus();
  main.scrollIntoView();
};
document.querySelector(".demo-reset").onclick = async () => {
  try {
    await DemoStore.reset();
    resetBooking();
    await boot(true);
    toast("Local demo bookings and check-ins cleared.");
  } catch (error) {
    toast(error.message);
  }
};
function shell() {
  document.querySelectorAll(".brand").forEach((brand) => {
    brand.innerHTML = `<img class="club-mark" src="assets/${esc(catalog.logo)}" alt="" width="36" height="36"><span>${esc(catalog.venue)}</span>`;
  });
  document.querySelector("[data-book]").href = routeURL(bookingURL());
  document.querySelector("#rental-link").hidden = !catalog.equipment.length;
  document.querySelector("#demo-label").hidden = !catalog.demo;
  document.querySelector("#footer-note").hidden = !catalog.demo;
  document.querySelector(".demo-reset").hidden = Boolean(catalog.bookingURL);
  const credit = document.querySelector("#credit");
  if (catalog.ayosURL && credit.tagName !== "A") {
    const link = document.createElement("a");
    link.id = credit.id;
    link.href = catalog.ayosURL;
    link.textContent = credit.textContent;
    credit.replaceWith(link);
  }
}
let renderVersion = 0;
async function boot(focus = false) {
  const version = ++renderVersion;
  path = (location.hash.slice(1).split("?")[0] || "/").replace(/\/$/, "") || "/";
  setMenu(false);
  try {
    const nextCatalog = await demo("/catalog");
    if (version !== renderVersion) return;
    catalog = nextCatalog;
    shell();
    if (path === "/") home();
    else if (path === "/courts") courtsPage();
    else if (path.startsWith("/courts/")) detail();
    else if (path === "/equipment") equipmentPage();
    else if (path === "/about") about();
    else if (path === "/contact") contact();
    else if (path === "/book" && catalog.bookingURL) {
      const url = bookingURL(findCourt(query().get("court")));
      main.innerHTML = head("Reservations", "Book a court", "Continue to the venue’s booking provider.", button("Continue to booking", url));
      location.replace(url);
    }
    else if (path === "/book") await booking(() => version === renderVersion);
    else if (path.startsWith("/confirmation/")) await confirmation(() => version === renderVersion);
    else if (path.startsWith("/pass/")) await passPage(() => version === renderVersion);
    else throw Error("This page is unavailable. Explore the current court catalogue.");
  } catch (error) {
    if (version !== renderVersion) return;
    main.innerHTML = head("The club", "Page unavailable", error.message, button("View courts", "/courts"));
  }
  if (version !== renderVersion) return;
  document.title = path === "/" ? catalog.venue + " | " + sports().join(" & ") :
    (main.querySelector("h1")?.textContent || "Venue") + " | " + catalog.venue;
  document.querySelectorAll("header nav a, #mobile-menu a").forEach((link) => {
    if (link.hash === "#" + path || (link.hash === "#/courts" && path.startsWith("/courts/"))) {
      link.setAttribute("aria-current", "page");
    } else link.removeAttribute("aria-current");
  });
  if (focus) main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
addEventListener("hashchange", () => boot(true));
boot();
