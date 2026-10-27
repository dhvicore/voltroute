// Google Maps Platform: live-traffic routes (Routes API) and EV charging
// stations along the route with charger details and, where operators share
// it, live availability (Places API, New). Used when GOOGLE_MAPS_API_KEY is set.
import { getDb } from "./db";

type LatLng = [number, number];
const KEY = () => process.env.GOOGLE_MAPS_API_KEY || "";
export const googleEnabled = () => KEY().length > 0;

export class GoogleMapsError extends Error {}

async function post(url: string, body: unknown, fieldMask: string, timeoutMs = 20000) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY(),
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[google]", url, res.status, data?.error?.message);
    throw new GoogleMapsError(data?.error?.message || `Google Maps responded ${res.status}`);
  }
  return data;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/** Same route, distance and traffic-aware time as the Google Maps app. */
export async function googleRoute(source: string, destination: string) {
  const data = await post(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      origin: { address: source },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      polylineQuality: "HIGH_QUALITY",
      regionCode: "IN",
      languageCode: "en-IN",
    },
    "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation",
  );
  const route = data.routes?.[0];
  if (!route?.polyline?.encodedPolyline) return null;
  const seconds = (s?: string) => Number(String(s || "0").replace("s", ""));
  return {
    distanceKm: route.distanceMeters / 1000,
    minutes: seconds(route.duration) / 60,
    minutesWithoutTraffic: seconds(route.staticDuration) / 60,
    encoded: route.polyline.encodedPolyline as string,
    coords: decodePolyline(route.polyline.encodedPolyline),
  };
}

const connectorMap: Record<string, string> = {
  EV_CONNECTOR_TYPE_CCS_COMBO_2: "CCS2",
  EV_CONNECTOR_TYPE_TYPE_2: "Type2",
  EV_CONNECTOR_TYPE_CHADEMO: "CHAdeMO",
};

function encodePolyline(points: LatLng[]) {
  let out = "";
  let prev: LatLng = [0, 0];
  const enc = (v: number) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    out += String.fromCharCode(v + 63);
  };
  for (const p of points) {
    const lat = Math.round(p[0] * 1e5), lng = Math.round(p[1] * 1e5);
    enc(lat - prev[0]);
    enc(lng - prev[1]);
    prev = [lat, lng];
  }
  return out;
}

/**
 * Searches EV charging stations along the route in segments (Google returns up
 * to 60 per search) and saves them, with live connector availability when the
 * operator shares it. Station providers' own settings are never overwritten.
 */
export async function importGoogleStations(segments: LatLng[][]) {
  const db = getDb();
  const insertStation = db.prepare(`
    INSERT INTO stations (id, name, operator, address, city, state, latitude, longitude, chargers_estimated, live_source, live_updated_at)
    VALUES (?, ?, NULL, ?, ?, '', ?, ?, ?, 'google', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET live_updated_at = datetime('now'), live_source = 'google'
  `);
  const insertCharger = db.prepare(`
    INSERT OR IGNORE INTO chargers (id, station_id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const setStatus = db.prepare("UPDATE chargers SET status = ? WHERE id = ?");
  const verified = db.prepare("SELECT operator_verified FROM stations WHERE id = ?");

  const seen = new Set<string>();
  for (const segment of segments) {
    let pageToken: string | undefined;
    for (let page = 0; page < 3; page++) {
      const data = await post(
        "https://places.googleapis.com/v1/places:searchText",
        {
          textQuery: "EV charging station",
          includedType: "electric_vehicle_charging_station",
          searchAlongRouteParameters: { polyline: { encodedPolyline: encodePolyline(segment) } },
          pageSize: 20,
          ...(pageToken ? { pageToken } : {}),
        },
        "places.id,places.displayName,places.formattedAddress,places.location,places.evChargeOptions,places.addressComponents,nextPageToken",
      );
      db.transaction(() => {
        for (const place of data.places || []) {
          if (seen.has(place.id) || !place.location) continue;
          seen.add(place.id);
          const id = `gpl-${place.id}`;
          const groups = (place.evChargeOptions?.connectorAggregation || []).filter(
            (g: any) => connectorMap[g.type],
          );
          const city =
            place.addressComponents?.find((c: any) => c.types?.includes("locality"))?.longText || "India";
          insertStation.run(
            id,
            place.displayName?.text || "EV charging station",
            place.formattedAddress || "",
            city,
            place.location.latitude,
            place.location.longitude,
            groups.length ? 0 : 1,
          );
          const providerManaged = (verified.get(id) as { operator_verified: number } | undefined)?.operator_verified;
          const list = groups.length ? groups : [{ type: "EV_CONNECTOR_TYPE_CCS_COMBO_2", count: 1, maxChargeRateKw: 50 }];
          for (const g of list) {
            const connector = connectorMap[g.type];
            const count = Math.min(Math.max(g.count || 1, 1), 8);
            const live = typeof g.availableCount === "number";
            for (let i = 0; i < count; i++) {
              const chargerId = `${id}-${connector}-${i + 1}`;
              // Live status from Google: first N available, then out of service, the rest in use.
              const status = !live
                ? "available"
                : i < g.availableCount
                  ? "available"
                  : i < g.availableCount + (g.outOfServiceCount || 0)
                    ? "out_of_service"
                    : "occupied";
              insertCharger.run(
                chargerId,
                id,
                connector,
                Math.round(g.maxChargeRateKw || (connector === "Type2" ? 22 : 50)),
                connector === "Type2" ? "AC" : "DC",
                status,
                connector === "Type2" ? 14 : 19,
              );
              if (live && !providerManaged) setStatus.run(status, chargerId);
            }
            if (live && !providerManaged)
              db.prepare("UPDATE stations SET live_status = 1 WHERE id = ?").run(id);
          }
        }
      })();
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }
}
