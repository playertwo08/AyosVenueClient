# Standalone client venue

Static HTML, CSS, and vanilla JavaScript. No install or build is required. Serve only this folder.

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. The homepage, courts, equipment, about, visit/contact, booking, confirmation, and pass pages use hash routes. Example court link: http://127.0.0.1:8765/#/courts/harbor.

## Client handoff

- Edit `data.js` for the venue identity, address, directions, email, phone, court hours and rates, currency and timezone, amenities, booking policy, and equipment. Use whole-hour opening and closing times on the same calendar day. Keep court and equipment IDs stable. Use a new `DEMO_KEY` for each venue or incompatible catalogue revision.
- Set `bookingURL` when a live provider is approved. Fill `bookingCourtParam` and each optional `providerId` only when the provider documents that query parameter. The provider handles its own availability, checkout and rentals.
- Set `ayosURL` to the approved attribution URL. The credit links to AYOS Technology. The separate homepage link uses `ayosVenueURL`. For local preview, run `python -m http.server 8766 --bind 127.0.0.1` from the `VENUE WEB` folder. Before hosting Breakwater publicly, replace the loopback URL with the published AYOS Venue page.
- Replace the concept images with approved photography under `assets/` and update the corresponding alt text in `data.js`. Update the favicon and document metadata in `index.html` and brand tokens in `client.css`.
- Keep demo labeling and `noindex,nofollow` during review. Review all facts, media rights, metadata, attribution, and live links before approving public release. Publish this folder to a static host. Relative paths and hash routes work from a subdirectory.

## Sample booking

Choose a future date and one or more hours. Noon illustrates unavailable time, 5 PM illustrates booked time, and 7 PM illustrates a held slot when those times are within court hours. Two Tide Court hours plus one paddle total ₱1,050. Select full demo payment or a 50% demo deposit of ₱525.

Review creates a five-minute hold. The same tab recovers selections after reload and offers to resume a pending hold. Re-enter sample player names and email after a reload. Confirmation stores individual QR pass URLs and one-time check-ins in browser-local storage. A pass can be opened in another tab at the same origin and browser profile. Changing the host, port, browser, or device changes the storage context. Use the footer reset to clear sample bookings and passes.

Sample data is fictional. The demo handles no real payments, reservations, notifications, or cross-device check-ins. Bundled fonts and QR code library carry their original license notices. See [image credits](docs/IMAGE-CREDITS.md).
