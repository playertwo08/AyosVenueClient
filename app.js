"use strict";

const main = document.querySelector("main");
let path = "/";
let catalog;
const routeURL = (url) => url.startsWith("/") ? "#" + url : url;
const query = () => new URLSearchParams(location.hash.split("?")[1]);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const money = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: VENUE_DATA.currency,
  maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
}).format(value);
const time = (hour) => `${hour % 12 || 12}:00 ${hour % 24 < 12 ? "AM" : "PM"}`;
const dateLabel = (date) => new Date(date + "T12:00:00Z").toLocaleDateString("en-PH", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
});
const sports = () => [...new Set(catalog.courts.map((court) => court.sport))];
const findCourt = (id) => catalog.courts.find((court) => court.id === id);
const demo = (route, body) => DemoStore.request(route, body);
const hoursLabel = ([open, close]) => `${time(open)} – ${time(close)}`;

let toastTimer;
function toast(message) {
  const status = document.querySelector("#toast");
  status.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = ""; }, 4500);
}
function photo(image, alt, eager = false) {
  return `<img src="assets/${esc(image)}" alt="${esc(alt)}" width="1800" height="1200" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
}
function button(label, url, secondary = false) {
  return `<a class="button ${secondary ? "secondary" : ""}" href="${esc(routeURL(url))}">${esc(label)} <span aria-hidden="true">↗</span></a>`;
}
function head(eyebrow, title, description = "", actions = "") {
  return `<section class="page-hero wrap"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${description ? `<p>${esc(description)}</p>` : ""}${actions ? `<div class="hero-actions">${actions}</div>` : ""}</section>`;
}
function bookingURL(court, equipment) {
  if (catalog.bookingURL) {
    const provider = new URL(catalog.bookingURL);
    if (court && catalog.bookingCourtParam)
      provider.searchParams.set(catalog.bookingCourtParam, court.providerId || court.id);
    return provider.href;
  }
  const params = new URLSearchParams();
  if (court) params.set("court", court.id);
  if (equipment) params.set("equipment", equipment);
  return "/book" + (params.size ? "?" + params : "");
}
const bookButton = (court) => button("Book a court", bookingURL(court));
const courtURL = (court) => "/courts/" + encodeURIComponent(court.id);

function courtCard(court) {
  return `<a class="court-card" href="${routeURL(courtURL(court))}"><div class="photo">${photo(court.image, court.alt)}<span class="photo-label">${esc(court.sport)}</span></div><div class="card-info"><div><h3>${esc(court.name)}</h3><p>Up to ${court.capacity} players · ${money(court.rate)} / hour</p></div><span class="circle-arrow" aria-hidden="true">↗</span></div></a>`;
}
function courtGrid(courts) {
  return courts.length ? `<div class="grid venue-grid">${courts.map(courtCard).join("")}</div>`
    : "<p>Court details will be available here once the catalogue is ready.</p>";
}
function visitFacts() {
  return `<div class="intro-strip wrap venue-facts"><div><strong>${catalog.courts.length}</strong><span>${catalog.courts.length === 1 ? "Court" : "Courts"}</span></div><div><strong>${hoursLabel(catalog.hours)}</strong><span>${catalog.demo ? "Sample daily hours" : "Daily hours"} · ${esc(catalog.timezoneLabel)}</span></div><div><strong>${esc(catalog.address || "To be confirmed")}</strong><span>Venue location</span></div></div>`;
}
function home() {
  const featured = [...catalog.courts].sort((a, b) => Number(b.sport === "Pickleball") - Number(a.sport === "Pickleball")).slice(0, 3);
  const rental = catalog.equipment.find((item) => item.sport === "Pickleball") || catalog.equipment[0];
  main.innerHTML = `<div class="club-stage"><section class="wrap client-hero" aria-labelledby="club-headline">
    <div class="client-hero-copy">
      <span class="client-hero-label">${esc(catalog.venue)}</span>
      <h1 id="club-headline">${esc(catalog.tagline)}</h1>
      <p>${esc(catalog.intro)}</p>
      <div class="club-actions">${bookButton()}<a class="text-link" href="#/courts">Explore courts <span aria-hidden="true">↗</span></a></div>
      <ul class="hero-sports" aria-label="Sports offered">${sports().map((sport) => `<li>${esc(sport)}</li>`).join("")}</ul>
    </div>
    <figure class="client-hero-figure">
      <div class="client-hero-image">${photo(catalog.hero.image, catalog.hero.alt, true)}<span class="hero-photo-label"><small>${catalog.demo ? "Venue concept" : "At the club"}</small>${esc(catalog.hero.caption)}</span></div>

    </figure>
  </section></div><div class="home-facts">${visitFacts()}</div>
  <section class="section wrap featured-courts"><div class="section-head"><div><span class="eyebrow">On court</span><h2>Find your court.</h2></div><a class="text-link" href="#/courts">See all courts ↗</a></div>${courtGrid(featured)}</section>
  <section class="wrap club-visit" aria-label="Facilities and rentals">
    <div class="club-visit-info">
      <span class="eyebrow">Around the club</span>
      <h2>Between games.</h2>
      <p>${esc(catalog.story)}</p>
      ${catalog.amenities.length ? `<ul class="club-amenities" aria-label="${catalog.demo ? "Sample facilities" : "Club facilities"}">${catalog.amenities.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}
      <a class="text-link" href="#/contact">Hours and directions ↗</a>
    </div>
    ${rental ? `<a class="home-rental" href="#/equipment">
      <div class="home-rental-image">${photo(rental.image, rental.alt)}</div>
      <div class="home-rental-label"><div><span class="eyebrow">Equipment rentals</span><h3>Gear for game day.</h3></div><span class="circle-arrow" aria-hidden="true">↗</span></div>
    </a>` : ""}
  </section>
  ${catalog.ayosVenueURL ? `<section class="section wrap ayos-visit" aria-labelledby="ayos-visit-title"><div><span class="eyebrow">Booking technology</span><h2 id="ayos-visit-title">AYOS Venue</h2><p>Explore the technology behind court reservations and player passes.</p></div>${button("Visit AYOS Venue", catalog.ayosVenueURL, true)}</section>` : ""}`;
}
function courtsPage() {
  main.innerHTML = head("The club", "Courts", catalog.demo ? "Compare sample courts, capacities, and hourly rates." : "Compare courts, capacities, and hourly rates.") +
    `<section class="section wrap">${courtGrid(catalog.courts)}</section>`;
}
function detail() {
  const court = findCourt(decodeURIComponent(path.slice("/courts/".length)));
  if (!court) throw Error("That court link could not be found. Choose a court from the current catalogue.");
  const related = catalog.courts.filter((other) => other.id !== court.id && other.sport === court.sport).slice(0, 3);
  main.innerHTML = head(court.sport + (catalog.demo ? " · Sample court" : ""), court.name, court.description, bookButton(court)) +
    `<section class="section wrap split"><div class="large-photo">${photo(court.image, court.alt, true)}</div><div><h2>Court details</h2><dl class="court-specs"><div><dt>Surface</dt><dd>${esc(court.surface)}</dd></div><div><dt>Capacity</dt><dd>${court.capacity} players</dd></div><div><dt>Hours</dt><dd>${hoursLabel(court.hours || catalog.hours)} · ${esc(catalog.timezoneLabel)}</dd></div><div><dt>Rate</dt><dd>${money(court.rate)} / hour</dd></div></dl></div></section>` +
    (related.length ? `<section class="section wrap"><div class="section-head"><h2>More courts</h2></div>${courtGrid(related)}</section>` : "");
}
function equipmentPage() {
  main.innerHTML = head("At the club", "Equipment rentals", catalog.demo ? "Sample rentals are priced per reservation." : "Rentals are priced per reservation.") +
    `<section class="section wrap"><div class="grid venue-grid">${catalog.equipment.map((item) =>
      `<article class="court-card"><div class="photo">${photo(item.image, item.alt)}</div><div class="rental-card"><h3>${esc(item.name)}</h3><p>${money(item.price)} / reservation · ${item.stock} units${catalog.demo ? " in the demo" : ""}<br>${esc(item.sport || "All sports")}</p>${button("Book with rental", bookingURL(item.sport ? catalog.courts.find((court) => supportsSport(item, court.sport)) : undefined, item.id), true)}</div></article>`
    ).join("")}</div>${catalog.equipment.length ? "" : "<p>Equipment rentals are currently unavailable.</p>"}</section>`;
}
function about() {
  main.innerHTML = head(catalog.demo ? "Demo venue" : "About the club", catalog.venue, catalog.story) +
    `<section class="section wrap"><div class="large-photo">${photo(catalog.hero.image, catalog.hero.alt, true)}</div></section>${visitFacts()}`;
}
function contact() {
  main.innerHTML = head("Plan your visit", "Visit & contact", catalog.address || "The venue address and directions are pending confirmation.") +
    visitFacts() + `<section class="section wrap"><h2>Get in touch</h2>
    ${catalog.mapURL ? button("Get directions", catalog.mapURL) : ""}
    ${catalog.email ? `<p><a class="text-link" href="mailto:${esc(catalog.email)}">${esc(catalog.email)}</a></p>` : ""}
    ${catalog.phone ? `<p><a class="text-link" href="tel:${esc(catalog.phone)}">${esc(catalog.phone)}</a></p>` : ""}
    ${catalog.email || catalog.phone ? "" : "<p>Contact channels are pending client confirmation.</p>"}</section>`;
}
const depositAmount = (amount) => Math.round(amount * 50) / 100;
