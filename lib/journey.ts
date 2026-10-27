// Real journey planning for any route in India: geocoding (Photon, with a
// Nominatim fallback), road routing (OSRM) and charging stations from
// OpenStreetMap (Overpass). Stations found along a route are saved to the
// database so drivers can book them and operators can claim them.
import { getDb } from "./db";
import { planChargingStops, ChargingPlanError } from "./charging-plan";
import type {
  Availability,
  Charger,
  Connector,
  PlannedRoute,
  RouteInput,
  Station,
} from "@/components/planner/types";

const GEOCODING_URL = process.env.GEOCODING_URL || "https://photon.komoot.io/api/";
const ROUTING_URL = process.env.ROUTING_URL || "https://router.project-osrm.org";
// Public Overpass servers are often busy, so try each in turn.
const OVERPASS_URLS = (
  process.env.OVERPASS_URL ||
  "https://overpass-api.de/api/interpreter,https://maps.mail.ru/osm/tools/overpass/api/interpreter,https://overpass.private.coffee/api/interpreter"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const userAgent = "VoltRoute-EV-Planner/1.0";
const indiaBbox = "68.1,6.5,97.4,35.7";

import { defaultEvModel, type EvModel } from "@/components/planner/ev-models";
import { googleEnabled, googleRoute, importGoogleStations } from "./google-maps";

const corridorKm = 8;

type LatLng = [number, number];

export class JourneyError extends Error {}

// TomTom routing gives real road routes with live traffic (free tier, no card).
async function tomtomRoute(from: LatLng, to: LatLng) {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return null;
  try {
    const data = await getJson(
      `https://api.tomtom.com/routing/1/calculateRoute/${from[0]},${from[1]}:${to[0]},${to[1]}/json?key=${encodeURIComponent(key)}&traffic=true&departAt=now&routeType=fastest&travelMode=car`,
      {},
      20000,
    );
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: route.summary.lengthInMeters / 1000,
      minutes: route.summary.travelTimeInSeconds / 60,
      coords: route.legs.flatMap((leg: any) =>
        leg.points.map((p: any) => [p.latitude, p.longitude] as LatLng),
      ),
    };
  } catch (e) {
    // Fall back to OSRM so a TomTom outage never blocks planning.
    console.error("[tomtom]", e);
    return null;
  }
}

function haversineKm([lat1, lon1]: LatLng, [lat2, lon2]: LatLng) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getJson(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": userAgent, ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

export async function geocode(query: string): Promise<{ point: LatLng; label: string }> {
  try {
    const data = await getJson(
      `${GEOCODING_URL}?q=${encodeURIComponent(query)}&limit=1&lang=en&bbox=${indiaBbox}`,
    );
    const feature = data.features?.[0];
    if (feature) {
      const [lng, lat] = feature.geometry.coordinates;
      const p = feature.properties || {};
      const label = [p.name, p.state].filter(Boolean).join(", ") || query;
      return { point: [lat, lng], label };
    }
  } catch (e) {
    console.error("[geocode:photon]", e);
  }
  try {
    const data = await getJson(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
    );
    if (data[0])
      return {
        point: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
        label: data[0].display_name.split(",").slice(0, 2).join(",").trim(),
      };
  } catch (e) {
    console.error("[geocode:nominatim]", e);
  }
  throw new JourneyError(`We couldn’t find “${query}”. Try a city or town name in India.`);
}

async function roadRoute(from: LatLng, to: LatLng) {
  const data = await getJson(
    `${ROUTING_URL}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
    {},
    20000,
  ).catch((e) => {
    console.error("[routing]", e);
    throw new JourneyError("The routing service is busy right now. Please try again in a moment.");
  });
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route)
    throw new JourneyError("No drivable road route was found between these places.");
  return {
    distanceKm: route.distance / 1000,
    minutes: route.duration / 60,
    coords: (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as LatLng,
    ),
  };
}

// Points roughly every `stepKm` along the line, each with its distance from the start.
function sample(coords: LatLng[], stepKm: number) {
  const out: { point: LatLng; km: number }[] = [{ point: coords[0], km: 0 }];
  let km = 0;
  let sinceLast = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineKm(coords[i - 1], coords[i]);
    km += d;
    sinceLast += d;
    if (sinceLast >= stepKm || i === coords.length - 1) {
      out.push({ point: coords[i], km });
      sinceLast = 0;
    }
  }
  return out;
}

function socketPower(tags: Record<string, string>, key: string, fallback: number) {
  const match = /([\d.]+)\s*kW/i.exec(tags[`${key}:output`] || "");
  return match ? Math.round(parseFloat(match[1])) : fallback;
}

function chargersFromTags(tags: Record<string, string>) {
  const list: { connector: string; power: number }[] = [];
  const add = (key: string, connector: string, fallback: number) => {
    const count = parseInt(tags[key] || "0", 10);
    if (count > 0 || tags[key] === "yes")
      for (let i = 0; i < Math.min(Math.max(count, 1), 4); i++)
        list.push({ connector, power: socketPower(tags, key, fallback) });
  };
  add("socket:type2_combo", "CCS2", 60);
  add("socket:chademo", "CHAdeMO", 50);
  add("socket:type2", "Type2", 22);
  // Most Indian stations in OpenStreetMap have no socket details yet.
  if (list.length === 0)
    list.push({ connector: "CCS2", power: 60 }, { connector: "Type2", power: 22 });
  return list;
}

interface FoundStation {
  id: string;
  name: string;
  operator: string | null;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  hours: string;
  chargers: { connector: string; power: number }[];
  chargersEstimated: boolean;
}

// Google encoded polyline, used by Open Charge Map's route search.
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
    const lat = Math.round(p[0] * 1e5);
    const lng = Math.round(p[1] * 1e5);
    enc(lat - prev[0]);
    enc(lng - prev[1]);
    prev = [lat, lng];
  }
  return out;
}

// Open Charge Map connection type IDs.
const ocmConnectors: Record<number, string> = { 33: "CCS2", 32: "CCS2", 2: "CHAdeMO", 25: "Type2", 1036: "Type2" };

// Open Charge Map has the widest coverage of Indian chargers. Needs a free key.
async function stationsFromOpenChargeMap(points: LatLng[]): Promise<FoundStation[] | null> {
  const key = process.env.OPENCHARGEMAP_KEY;
  if (!key) return null;
  try {
    const data = await getJson(
      `https://api.openchargemap.io/v3/poi/?output=json&countrycode=IN&maxresults=1000&verbose=false&distance=${corridorKm}&distanceunit=KM&polyline=${encodeURIComponent(encodePolyline(points))}`,
      { headers: { "X-API-Key": key } },
      30000,
    );
    return (data as any[]).flatMap((poi) => {
      const a = poi.AddressInfo;
      if (!a || typeof a.Latitude !== "number") return [];
      const chargers = (poi.Connections || []).flatMap((c: any) => {
        const connector = ocmConnectors[c.ConnectionTypeID];
        if (!connector) return [];
        const power = Math.round(c.PowerKW || (connector === "Type2" ? 22 : 50));
        return Array.from({ length: Math.min(Math.max(c.Quantity || 1, 1), 4) }, () => ({ connector, power }));
      });
      return [
        {
          id: `ocm-${poi.ID}`,
          name: a.Title || "EV charging station",
          operator: poi.OperatorInfo?.Title || null,
          address: [a.AddressLine1, a.Town].filter(Boolean).join(", ") || a.Title,
          city: a.Town || "India",
          state: a.StateOrProvince || "",
          lat: a.Latitude,
          lng: a.Longitude,
          hours: a.AccessComments || "24/7",
          chargers: chargers.length ? chargers : [{ connector: "CCS2", power: 50 }, { connector: "Type2", power: 22 }],
          chargersEstimated: chargers.length === 0,
        },
      ];
    });
  } catch (e) {
    console.error("[openchargemap]", e instanceof Error ? e.message : e);
    return null;
  }
}

const tomtomConnectors: Record<string, string> = {
  IEC62196Type2CCS: "CCS2",
  IEC62196Type2CableAttached: "Type2",
  IEC62196Type2Outlet: "Type2",
  Chademo: "CHAdeMO",
};

// TomTom has the widest coverage of Indian chargers on the free tier:
// search around points every ~40 km along the road.
async function stationsFromTomTom(coords: LatLng[]): Promise<FoundStation[] | null> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return null;
  const probes = sample(coords, 40).map((s) => s.point);
  const found = new Map<string, FoundStation>();
  let ok = false;
  // The free tier allows a few requests per second, so search two points at a
  // time with a short pause, retrying once if TomTom asks us to slow down.
  const search = async ([lat, lng]: LatLng) => {
    const url = `https://api.tomtom.com/search/2/categorySearch/charging%20station.json?key=${encodeURIComponent(key)}&lat=${lat}&lon=${lng}&radius=${(corridorKm + 4) * 1000}&categorySet=7309&limit=100`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await getJson(url, {}, 15000);
      } catch (e) {
        if (!(e instanceof Error && e.message.includes("429")) || attempt === 2) {
          console.error("[tomtom search]", e instanceof Error ? e.message : e);
          return null;
        }
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
    return null;
  };
  for (let i = 0; i < probes.length; i += 2) {
    const batch = await Promise.all(probes.slice(i, i + 2).map(search));
    await new Promise((r) => setTimeout(r, 300));
    for (const data of batch) {
      if (!data) continue;
      ok = true;
      for (const r of data.results || []) {
        if (found.has(r.id) || !r.position) continue;
        const listed = (r.chargingPark?.connectors || []) as { connectorType: string; ratedPowerKW?: number }[];
        const chargers = listed
          .filter((c) => tomtomConnectors[c.connectorType])
          .slice(0, 6)
          .map((c) => ({
            connector: tomtomConnectors[c.connectorType],
            power: Math.round(c.ratedPowerKW || (tomtomConnectors[c.connectorType] === "Type2" ? 22 : 50)),
          }));
        // Skip sites that only list household sockets; they can't charge a car on a trip.
        if (listed.length > 0 && chargers.length === 0) continue;
        const a = r.address || {};
        found.set(r.id, {
          id: `tt-${r.id}`,
          name: r.poi?.name || "EV charging station",
          operator: r.poi?.brands?.[0]?.name || null,
          address: a.freeformAddress || `${r.position.lat.toFixed(4)}, ${r.position.lon.toFixed(4)}`,
          city: a.municipality || "India",
          state: a.countrySubdivision || "",
          lat: r.position.lat,
          lng: r.position.lon,
          hours: "24/7",
          chargers: chargers.length ? chargers : [{ connector: "CCS2", power: 50 }, { connector: "Type2", power: 22 }],
          chargersEstimated: chargers.length === 0,
        });
      }
    }
  }
  return ok ? Array.from(found.values()) : null;
}

async function stationsFromOpenStreetMap(points: LatLng[]): Promise<FoundStation[] | null> {
  const around = points.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join(",");
  const query = `[out:json][timeout:50];nwr(around:${corridorKm * 1000},${around})["amenity"="charging_station"];out center tags;`;
  for (const url of OVERPASS_URLS) {
    try {
      const data = await getJson(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        },
        55000,
      );
      return (data.elements || []).flatMap((el: any) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        const tags: Record<string, string> = el.tags || {};
        if (typeof lat !== "number" || typeof lng !== "number" || tags.access === "private") return [];
        const operator = tags.operator || tags.brand || tags.network || null;
        const city = tags["addr:city"] || tags["addr:district"] || "";
        return [
          {
            id: `osm-${el.type[0]}${el.id}`,
            name: tags.name || (operator ? `${operator} charging station` : "EV charging station"),
            operator,
            address:
              [tags["addr:housenumber"], tags["addr:street"], city].filter(Boolean).join(", ") ||
              `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            city: city || "India",
            state: tags["addr:state"] || "",
            lat,
            lng,
            hours: tags.opening_hours || "24/7",
            chargers: chargersFromTags(tags),
            chargersEstimated: !["socket:type2_combo", "socket:chademo", "socket:type2"].some((k) => tags[k]),
          },
        ];
      });
    } catch (e) {
      console.error("[overpass]", url, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

// Find charging stations along the route and store them so they can be booked.
async function importStations(coords: LatLng[], cacheKey: string) {
  const db = getDb();
  db.exec(
    "CREATE TABLE IF NOT EXISTS route_station_cache (key TEXT PRIMARY KEY, fetched_at TEXT NOT NULL DEFAULT (datetime('now')))",
  );
  const cached = db
    .prepare(
      "SELECT 1 FROM route_station_cache WHERE key = ? AND fetched_at > datetime('now','-7 days')",
    )
    .get(cacheKey);
  if (cached) return;

  const totalKm = sample(coords, 1e9).at(-1)!.km;
  const points = sample(coords, Math.max(4, totalKm / 90)).map((s) => s.point);
  // TomTom covers Indian chargers best; only fall back to the slower free sources without it.
  const tomtom = await stationsFromTomTom(coords);
  const [ocm, osm] = tomtom ? [null, null] : await Promise.all([
    stationsFromOpenChargeMap(points),
    stationsFromOpenStreetMap(points),
  ]);
  // Stations already in the database still show up if both sources fail.
  if (!tomtom && !ocm && !osm) return;
  const found = [...(tomtom || []), ...(ocm || []), ...(osm || [])];

  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO stations (id, name, operator, address, city, state, latitude, longitude, opening_hours, chargers_estimated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCharger = db.prepare(`
    INSERT OR IGNORE INTO chargers (id, station_id, connector_type, power_kw, charging_type, price_per_kwh, session_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    for (const st of found) {
      // The same site often appears in both sources; keep the first one.
      const duplicate = db
        .prepare(
          "SELECT 1 FROM stations WHERE id != ? AND abs(latitude - ?) < 0.0005 AND abs(longitude - ?) < 0.0005",
        )
        .get(st.id, st.lat, st.lng);
      if (duplicate) continue;
      insertStation.run(st.id, st.name, st.operator, st.address, st.city, st.state, st.lat, st.lng, st.hours, st.chargersEstimated ? 1 : 0);
      st.chargers.forEach((c, i) =>
        insertCharger.run(
          `${st.id}-${i + 1}`,
          st.id,
          c.connector,
          c.power,
          c.connector === "Type2" ? "AC" : "DC",
          c.connector === "Type2" ? 14 : 19,
          0,
        ),
      );
    }
    // Only cache a complete lookup, so a missing key or busy server is retried.
    if (tomtom || ocm || (!process.env.OPENCHARGEMAP_KEY && !process.env.TOMTOM_API_KEY))
      db.prepare("INSERT OR REPLACE INTO route_station_cache (key) VALUES (?)").run(cacheKey);
  })();
}

interface StationRow {
  id: string;
  name: string;
  operator: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  amenities: string | null;
  rating: number | null;
  rating_count: number | null;
  chargers_estimated: number;
  operator_verified: number;
  live_status: number;
}
interface ChargerRow {
  id: string;
  station_id: string;
  connector_type: string;
  power_kw: number;
  status: string;
  price_per_kwh: number;
  session_fee: number | null;
}

function toConnector(type: string): Connector | null {
  if (type === "Type2") return "Type 2";
  if (type === "CCS2" || type === "CHAdeMO") return type;
  return null;
}

function stationsAlongRoute(coords: LatLng[]): Station[] {
  const db = getDb();
  const lats = coords.map((c) => c[0]);
  const lngs = coords.map((c) => c[1]);
  const pad = 0.1;
  const rows = db
    .prepare(
      `SELECT id, name, operator, address, city, latitude, longitude, amenities, chargers_estimated, operator_verified, live_status,
         -- Only ratings from real driver reviews; seeded station ratings are made up.
         (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.station_id = stations.id) as rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.station_id = stations.id) as rating_count
       FROM stations WHERE is_enabled = 1
         AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?`,
    )
    .all(
      Math.min(...lats) - pad,
      Math.max(...lats) + pad,
      Math.min(...lngs) - pad,
      Math.max(...lngs) + pad,
    ) as StationRow[];
  if (rows.length === 0) return [];

  const samples = sample(coords, 1);
  const near = rows
    .map((row) => {
      let best = { d: Infinity, km: 0 };
      for (const s of samples) {
        const d = haversineKm([row.latitude, row.longitude], s.point);
        if (d < best.d) best = { d, km: s.km };
      }
      return { row, ...best };
    })
    .filter((s) => s.d <= corridorKm);
  if (near.length === 0) return [];

  const ids = near.map((s) => s.row.id);
  const chargers = db
    .prepare(
      `SELECT id, station_id, connector_type, power_kw, status, price_per_kwh, session_fee
       FROM chargers WHERE station_id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids) as ChargerRow[];
  const booked = db
    .prepare(
      `SELECT charger_id FROM bookings WHERE status = 'confirmed'
         AND booking_date = date('now','+5 hours','+30 minutes')
         AND start_time <= strftime('%H:%M','now','+5 hours','+30 minutes')
         AND end_time > strftime('%H:%M','now','+5 hours','+30 minutes')`,
    )
    .all() as { charger_id: string }[];
  const busy = new Set(booked.map((b) => b.charger_id));

  return near
    .map(({ row, d, km }) => {
      const own = chargers.filter((c) => c.station_id === row.id);
      // Free right now: the station's live status (when set) and no booking in progress.
      const freeNow = new Set(
        own.filter((c) => c.status === "available" && !busy.has(c.id)).map((c) => c.id),
      );
      const list: Charger[] = own
        .flatMap((c) => {
          const connector = toConnector(c.connector_type);
          return connector
            ? [
                {
                  id: c.id,
                  connector,
                  power: c.power_kw,
                  price: c.price_per_kwh,
                  sessionFee: c.session_fee || 0,
                  // Bookable for a future slot unless the station marked it out of service.
                  available: c.status !== "out_of_service",
                },
              ]
            : [];
        });
      const available = list.filter((c) => freeNow.has(c.id)).length;
      const availability: Availability =
        available === 0 ? "full" : available / list.length < 0.5 ? "filling" : "available";
      let amenities: string[] = [];
      try {
        amenities = JSON.parse(row.amenities || "[]");
      } catch {}
      return {
        id: row.id,
        name: row.name,
        operator: row.operator || "Independent",
        address: row.address,
        rating: row.rating || 0,
        reviews: row.rating_count || 0,
        availability,
        available,
        total: list.length,
        amenities,
        chargers: list,
        distanceAlongRoute: Math.round(km),
        detourMinutes: Math.max(1, Math.round(d * 3)),
        mapPosition: { x: 0, y: 0 },
        location: { lat: row.latitude, lng: row.longitude },
        // Until the station provider publishes its own details, prices are defaults
        // and availability only reflects VoltRoute bookings.
        estimates: row.operator_verified
          ? undefined
          : { price: true, chargers: !!row.chargers_estimated, availability: !row.live_status },
      } satisfies Station;
    })
    .filter((s) => s.chargers.length > 0)
    .sort((a, b) => a.distanceAlongRoute - b.distanceAlongRoute);
}

// The driver's own car when sent (validated), otherwise a typical EV.
function carFromInput(input: RouteInput): EvModel {
  const c = input.car;
  const ok = (n: unknown, min: number, max: number) =>
    typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
  if (c && ok(c.batteryKwh, 5, 200) && ok(c.rangeKm, 50, 1000) && ok(c.maxDcKw, 0, 400) && ok(c.maxAcKw, 1, 50))
    return {
      ...defaultEvModel,
      id: "custom",
      name: String(c.name || "Your EV").slice(0, 80),
      batteryKwh: c.batteryKwh,
      rangeKm: c.rangeKm,
      maxDcKw: c.maxDcKw,
      maxAcKw: c.maxAcKw,
    };
  return defaultEvModel;
}

export async function planJourney(input: RouteInput): Promise<PlannedRoute> {
  const car = carFromInput(input);
  let from: { label: string };
  let to: { label: string };
  let road: { distanceKm: number; minutes: number; coords: LatLng[] };
  let liveTraffic = false;
  if (googleEnabled()) {
    // Google: the same route, distance and live-traffic time as the Google Maps app.
    const g = await googleRoute(input.source, input.destination).catch((e) => {
      throw new JourneyError(`Google Maps couldn’t plan this route: ${e.message}`);
    });
    if (!g) throw new JourneyError("No drivable road route was found between these places.");
    from = { label: input.source };
    to = { label: input.destination };
    road = g;
    liveTraffic = true;
    // Refresh stations (and their live availability) at most every 10 minutes per route.
    const key = `google:${input.source.toLowerCase()}|${input.destination.toLowerCase()}`;
    const db = getDb();
    db.exec(
      "CREATE TABLE IF NOT EXISTS route_station_cache (key TEXT PRIMARY KEY, fetched_at TEXT NOT NULL DEFAULT (datetime('now')))",
    );
    const fresh = db
      .prepare("SELECT 1 FROM route_station_cache WHERE key = ? AND fetched_at > datetime('now','-10 minutes')")
      .get(key);
    if (!fresh) {
      // Search in ~120 km segments so long routes aren't capped at 60 results.
      const segments: LatLng[][] = [];
      const points = sample(g.coords, 2).map((p) => p.point);
      const per = Math.max(2, Math.ceil(points.length / Math.ceil(g.distanceKm / 120)));
      for (let i = 0; i < points.length - 1; i += per - 1) segments.push(points.slice(i, i + per));
      await importGoogleStations(segments).catch((e) => console.error("[google places]", e));
      db.prepare("INSERT OR REPLACE INTO route_station_cache (key, fetched_at) VALUES (?, datetime('now'))").run(key);
    }
  } else {
    const [a, b] = await Promise.all([geocode(input.source), geocode(input.destination)]);
    if (haversineKm(a.point, b.point) < 1)
      throw new JourneyError("Choose a destination different from your starting point.");
    from = a;
    to = b;
    const live = await tomtomRoute(a.point, b.point);
    road = live || (await roadRoute(a.point, b.point));
    liveTraffic = !!live;
    const key = [...a.point, ...b.point].map((n) => n.toFixed(2)).join(",");
    await importStations(road.coords, key);
  }
  const stations = stationsAlongRoute(road.coords);
  const distance = Math.round(road.distanceKm);
  let plan: ReturnType<typeof planChargingStops>;
  let warning: string | undefined;
  try {
    plan = planChargingStops(input, distance, stations, car);
  } catch (e) {
    if (!(e instanceof JourneyError) && !(e instanceof ChargingPlanError)) throw e;
    // Still show the real route and every known station along it.
    warning = `${e.message} Known stations on this route are shown on the map.`;
    plan = {
      stops: [],
      chargeMinutes: 0,
      detourMinutes: 0,
      estimatedCost: 0,
      arrivalBattery: Math.max(0, Math.round(input.battery - (distance / car.rangeKm) * 100)),
    };
  }
  return {
    id: `route-${Date.now()}`,
    source: from.label,
    destination: to.label,
    distance,
    // Preserve the routing provider's returned duration; never add an invented traffic multiplier.
    driveMinutes: Math.round(road.minutes),
    liveTraffic,
    trafficUpdatedAt: liveTraffic ? new Date().toISOString() : undefined,
    chargingNote: input.connector === "Type 2" && plan.chargeMinutes >= 45
      ? `Type 2 (AC) charging is limited to ${car.maxAcKw} kW by your car. ${car.maxDcKw > 0 ? "Choose a compatible DC connector for a faster stop." : "This car supports AC charging only, so a longer stop may be needed."}`
      : undefined,
    ...plan,
    stations,
    coordinates: sample(road.coords, Math.max(0.5, distance / 600)).map((s) => s.point),
    isDemo: false,
    startBattery: input.battery,
    rangeKm: car.rangeKm,
    batteryKwh: car.batteryKwh,
    maxDcKw: car.maxDcKw,
    maxAcKw: car.maxAcKw,
    vehicleName: car.name,
    warning,
  };
}
