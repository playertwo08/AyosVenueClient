"use strict";

const VENUE_DATA = {
  venue: "Breakwater Racket Club",
  logo: "favicon.svg",
  tagline: "Make it a court day.",
  intro: "Book a pickleball court in the open air or bring your doubles group indoors for badminton.",
  demo: true,
  currency: "PHP",
  timezone: "Asia/Manila",
  timezoneLabel: "Philippine time",
  address: "",
  mapURL: "",
  email: "",
  phone: "",
  ayosURL: "https://www.ayostechnology.com",
  ayosVenueURL: "http://127.0.0.1:8766/index.html#/ayos-venue",
  bookingURL: "",
  bookingCourtParam: "",
  allowMultipleCourts: true,
  allowDeposit: true,
  hours: [7, 22],
  hero: { image: "pickleball-hero.jpg", alt: "Concept rendering of players on outdoor pickleball courts at golden hour", caption: "Pickleball outdoors" },
  story: "Breakwater is a sample racket club for morning pickleball, evening badminton, and the time between matches.",
  amenities: ["Shaded spectator deck", "Water refill station", "Day-use lockers"],
  courts: [
    {
      id: "tide", name: "Tide Court", sport: "Pickleball",
      rate: 480, capacity: 4, surface: "Outdoor acrylic hard court",
      image: "pickleball-courts.jpg", alt: "Aerial reference photo of blue outdoor pickleball courts",
      description: "An open-air hard court for early games and casual doubles.",
    },
    {
      id: "dune", name: "Dune Court", sport: "Pickleball",
      rate: 560, capacity: 4, surface: "Outdoor acrylic hard court",
      hours: [8, 21],
      image: "pickleball-hero.jpg", alt: "Concept rendering of outdoor pickleball courts at golden hour",
      description: "An outdoor court for practice sessions and late-afternoon matches.",
    },
    {
      id: "harbor", name: "Harbor Hall", sport: "Badminton",
      rate: 360, capacity: 4, surface: "Indoor synthetic mat",
      hours: [9, 22],
      image: "badminton.jpg", alt: "Reference photo of a badminton player reaching overhead on an indoor court",
      description: "An indoor badminton court for singles drills and doubles games.",
    },
  ],
  equipment: [
    { id: "paddle", name: "Pickleball paddle", sport: "Pickleball", price: 90, stock: 10, image: "paddle-product.jpg", alt: "Concept image of a black pickleball paddle and two lime balls" },
    { id: "racket", name: "Badminton racket", sport: "Badminton", price: 70, stock: 8, image: "badminton.jpg", alt: "Reference photo showing a player holding a badminton racket" },
    { id: "scoreboard", name: "Portable flip scoreboard", price: 60, stock: 4, image: "scoreboard.svg", alt: "Tabletop flip scoreboard displaying seven to five" },
  ],
};

// Equipment without a sport can be rented for any court.
const supportsSport = (item, sport) => !item.sport || item.sport === sport;

const DEMO_KEY = "client-venue-breakwater-example-v1";
const DRAFT_KEY = DEMO_KEY + ":draft";

