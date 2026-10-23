# VoltRoute React planner

The home page, `/map`, and `/dashboard` use the same `VoltRoutePlanner` component. The original application is preserved at `/legacy`; existing API routes are unchanged.

## Components

- `volt-route-planner.tsx` coordinates routing, filters, saved stations, and bookings.
- `route-panel.tsx` contains source and destination inputs, the battery slider, connector filters, and route preference.
- `route-map.tsx` provides a key-free illustrative map with clickable availability markers, zoom, reset, and terrain controls.
- `route-summary.tsx` shows trip metrics and a collapsible charging timeline.
- `station-card.tsx` renders selectable and saveable station cards.
- `booking-drawer.tsx` handles charger selection, date and duration, hourly slots, overlap checks, pricing, and confirmation.
- `dialog.tsx` uses native modal dialogs for focus trapping, Escape dismissal, and focus restoration.
- `types.ts` defines the provider contracts; `demo-data.ts` contains the isolated demo route and fixtures.

Styling combines Tailwind utilities and scoped `vr-` classes in `app/planner.css`. Icons use Lucide React, and transitions use Framer Motion with reduced-motion support. At desktop sizes, the controls scroll independently of the map. At smaller sizes, route controls collapse and station details open as a bottom drawer.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. Validate types with `npx tsc --noEmit` and build with `npm run build`.

## Connect providers

Use a client wrapper and pass a stable `PlannerAdapters` object:

```tsx
"use client";

import { VoltRoutePlanner } from "@/components/planner/volt-route-planner";
import type { PlannerAdapters } from "@/components/planner/types";

// Define outside the component, or memoize it. Callback identities should be stable.
const adapters: PlannerAdapters = {
  // stations: normalized station records with real charger IDs,
  // calculateRoute: async input => normalizeRoute(await yourRouteProvider(input)),
  // MapComponent: YourMapboxOrGoogleMap,
  // getBookedSlots: async (chargerId, date, signal) => ...,
  // bookSlot: async request => ({ id: ... }),
};

export default function ConnectedPlanner() {
  return <VoltRoutePlanner adapters={adapters} />;
}
```

`calculateRoute` receives `source`, `destination`, `battery`, `connector`, and `preference`. Return a `PlannedRoute` with compatible stations, route metrics, recommended stops, and `isDemo: false`. With this adapter supplied, the planner starts without a demo route. For charging-friendly routing, request alternative routes from your map provider, score the compatible reachable charging stations along each geometry, and choose the appropriate route. The illustrative preview does not implement real geocoding, navigation, telemetry, or density-based road routing.

`MapComponent` receives the route, filtered stations, selected station ID, saved station IDs, and `onSelectStation`. Use your provider's native geometry and geographic coordinates in your wrapper. `mapPosition` and `mapPath` are only for the illustrative map; they are not geographic coordinates. Keep geographic station data in your adapter/provider layer, keyed by station ID.

### Existing API mapping

Your current endpoints can back the adapters once station and charger IDs are normalized from the database. Do not send the demo fixture IDs to the backend.

| Adapter      | Endpoint                                                 | Mapping                                                                                                                             |
| ------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Station data | `GET /api/stations` and `GET /api/stations/:id/chargers` | Normalize availability, prices, charger IDs and connector names into `Station[]`                                                    |
| Routing      | `POST /api/route-planner`                                | Map input to `from`, `to`, `battery_pct`, `priority`, and vehicle capacity/range; normalize the returned route and stops            |
| Availability | `GET /api/chargers/:id/availability?date=YYYY-MM-DD`     | Map `booked_slots` from `start_time`, `duration_minutes` to `startTime`, `durationMinutes`; pass the provided abort signal to fetch |
| Reservation  | `POST /api/bookings`                                     | Map to `station_id`, `charger_id`, `booking_date`, `start_time`, `duration_minutes`; return `booking.id`                            |

Authenticated endpoints expect the existing Bearer token (`vr_token` in the original app). Read it only in the browser, handle missing/expired authentication, and throw readable errors on non-success HTTP responses. Never treat a failed request as a successful booking. The server remains authoritative for slot conflicts and pricing. Add polling or your station provider's subscriptions if you need live availability.

Supply `bookSlot` and `getBookedSlots` together for a connected booking flow. The current availability API omits bookings' IDs and uses confirmed/completed reservations; its results are normalized intervals, not a list of available hourly slots.

## Demo behavior

- Supported demo journey: Mumbai ↔ Pune; unsupported cities produce a clear message.
- Both route preferences, battery estimates, and connector filters affect the preview.
- Stations, prices, reviews, routes, and available slots are illustrative.
- Demo bookings never call the booking API and do not reserve real chargers.
- Saved station IDs and preview bookings persist on the current browser under `voltroute-planner-v1`; storage failure falls back to session state.
- The booking picker blocks elapsed times, full chargers, booked intervals, and overlaps with preview bookings. A different date, charger, or duration clears the time selection.
- Charging costs are estimates at rated charger output. Actual delivered energy and operator pricing may differ.
