# VoltRoute

Run `npm install`, then `npm run dev` and open http://localhost:3000.
For deployment, run `npm run build`, then `npm start` (Next.js uses Render's `PORT`).

## Pages

- `/`: landing page using the existing Brand, RoadIllustration and LandingPage components.
- `/login` and `/register`: saved account login and signup.
- `/profile` and `/dashboard`: user account page with editable name/phone, saved activity, planner link, and logout.
- `/planner` and `/map`: the existing VoltRoutePlanner frontend and demo flow.
- `/legacy`: the original legacy application.

The planner, station cards, illustrative map, route summary, booking drawer, and existing route/booking/session APIs retain their original behavior. The only planner change is its existing account link now points to `/profile`.

Accounts use the existing SQLite `users` table, bcrypt password hashes, and seven-day HttpOnly/SameSite cookies. Existing bearer-token API clients remain supported. A signing secret is generated and saved in the database unless `JWT_SECRET` is set. Profile information is loaded for the authenticated user, and passwords are never returned by the API.

Copy `.env.example` to `.env.local` only if custom configuration is needed. `DB_PATH` selects the database file. Back up the database and use a persistent disk for durable storage. Render free web services have an ephemeral filesystem: SQLite accounts and profile changes are lost when the service sleeps, restarts or redeploys. Keeping them permanently on a free plan requires an external free database account; no paid service or API was added by this change.

The existing planner uses sample station data and device-local demo bookings. It does not reserve physical operator chargers. User activity figures on the account page reflect the existing backend database; planner preview bookings remain in the demo.

## Verification

- `npm run build`
- `npm run test:flow`: isolated account tests, including server restart persistence and profile validation.
- `node scripts/check-booking-validation.cjs`: existing booking validation checks.

Next.js was patched from 14.2.5 to 14.2.35. The dependency audit still reports framework advisories requiring a major upgrade before production use.

## Station operators (booking console)

Two kinds of accounts share the same login page:

- **EV drivers** sign up normally, plan a route at `/planner`, and book a charging slot (date, start time, duration). While logged in, bookings are saved to the database.
- **Station providers** choose **Station provider** on `/register` and pick the station they run. After login they land on `/operator`, which lists every booking at their station: driver name, email, phone, date, time slot, charger and estimated cost. The page refreshes every 15 seconds and shows a "new bookings" notice until the operator marks them as seen.

A development operator account is created automatically for Khalapur:
`khalapur.admin@voltroute.app` / `operator123` (change or remove it in `lib/planner-stations.ts` before a public launch). The seeded `admin@voltroute.app` account can see bookings at every station.

### Persistence on Render

All data lives in the SQLite file at `DB_PATH`. On Render, attach a **persistent disk** (for example mounted at `/var/data`) and set `DB_PATH=/var/data/voltroute.db` and a long random `JWT_SECRET`. Without a disk, Render wipes the file on every deploy or restart and all accounts and bookings are lost.

## Live route planner (any route in India)

`/planner` now plans real journeys anywhere in India:

- **Places and roads:** Photon (OpenStreetMap) finds the cities, and OSRM calculates the actual road route, drawn on an OpenStreetMap map.
- **Charging stations:** stations along the route come from **Open Charge Map** (set `OPENCHARGEMAP_KEY`) and OpenStreetMap. Every station found is saved to the database, so drivers can book it and its owner can sign up for it as a station provider.
- **Charging stops:** the planner picks stops for the chosen battery level and connector. If the known stations on a route are too far apart, it still shows the route and stations, with a warning.

The first search for a new route can take up to a minute; repeat searches use the saved stations. **Run your demo routes once before presenting.**

Get a free Open Charge Map key at https://openchargemap.org (sign up, then My Profile → My Apps → Register an application). Without it, coverage relies on OpenStreetMap, which has few Indian chargers.
