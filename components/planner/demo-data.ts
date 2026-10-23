import type { Connector, PlannedRoute, RouteInput, Station } from "./types";

// Fictional availability and prices. No external map key is needed.
function chargers(
  id: string,
  power: number,
  price: number,
  extra: Connector = "Type 2",
) {
  return [
    {
      id: `${id}-dc`,
      connector: "CCS2" as Connector,
      power,
      price,
      sessionFee: 0,
      available: true,
    },
    {
      id: `${id}-ac`,
      connector: extra,
      power: extra === "Type 2" ? 22 : 50,
      price: price - 2,
      sessionFee: 0,
      available: true,
    },
  ];
}
export const demoStations: Station[] = [
  {
    id: "khalapur",
    name: "Tata Power · Khalapur",
    operator: "Tata Power",
    address: "Expressway Food Mall, Khalapur · NH 48",
    rating: 4.8,
    reviews: 128,
    availability: "available",
    available: 4,
    total: 6,
    amenities: ["Café", "Restrooms", "Wi-Fi", "24/7"],
    chargers: chargers("khalapur", 150, 18),
    distanceAlongRoute: 52,
    detourMinutes: 2,
    mapPosition: { x: 488, y: 445 },
    recommended: true,
  },
  {
    id: "lonavala",
    name: "ChargeZone · Lonavala",
    operator: "ChargeZone",
    address: "Old Mumbai–Pune Highway, Lonavala",
    rating: 4.6,
    reviews: 96,
    availability: "filling",
    available: 1,
    total: 4,
    amenities: ["Café", "Restrooms", "Parking"],
    chargers: chargers("lonavala", 60, 16, "CHAdeMO"),
    distanceAlongRoute: 91,
    detourMinutes: 4,
    mapPosition: { x: 735, y: 400 },
  },
  {
    id: "talegaon",
    name: "Statiq · Talegaon",
    operator: "Statiq",
    address: "Somatane Phata, Talegaon Dabhade",
    rating: 4.7,
    reviews: 84,
    availability: "available",
    available: 3,
    total: 4,
    amenities: ["Restrooms", "Wi-Fi", "24/7"],
    chargers: chargers("talegaon", 120, 17),
    distanceAlongRoute: 122,
    detourMinutes: 3,
    mapPosition: { x: 942, y: 465 },
  },
  {
    id: "panvel",
    name: "Jio-bp pulse · Panvel",
    operator: "Jio-bp pulse",
    address: "Panvel Highway, Navi Mumbai",
    rating: 4.5,
    reviews: 62,
    availability: "available",
    available: 2,
    total: 4,
    amenities: ["Café", "Parking"],
    chargers: chargers("panvel", 50, 15),
    distanceAlongRoute: 32,
    detourMinutes: 3,
    mapPosition: { x: 366, y: 300 },
  },
  {
    id: "khopoli",
    name: "Zeon · Khopoli",
    operator: "Zeon Charging",
    address: "Khopoli Exit, Mumbai–Pune Expressway",
    rating: 4.4,
    reviews: 54,
    availability: "full",
    available: 0,
    total: 4,
    amenities: ["Restrooms", "Café"],
    chargers: chargers("khopoli", 60, 19).map((c) => ({
      ...c,
      available: false,
    })),
    distanceAlongRoute: 68,
    detourMinutes: 5,
    mapPosition: { x: 650, y: 565 },
  },
  {
    id: "wakad",
    name: "Tata Power · Wakad",
    operator: "Tata Power",
    address: "Wakad, Pimpri-Chinchwad, Pune",
    rating: 4.7,
    reviews: 110,
    availability: "available",
    available: 5,
    total: 6,
    amenities: ["Café", "Wi-Fi", "24/7"],
    chargers: chargers("wakad", 150, 18, "CHAdeMO"),
    distanceAlongRoute: 137,
    detourMinutes: 2,
    mapPosition: { x: 1040, y: 630 },
  },
];
export const defaultInput: RouteInput = {
  source: "Mumbai, Maharashtra",
  destination: "Pune, Maharashtra",
  battery: 62,
  connector: "CCS2",
  preference: "charging",
};
const normalPath =
  "M 185 275 C 255 260 295 300 330 350 S 408 455 488 445 S 620 360 735 400 S 870 450 942 465 S 1000 530 1030 605 S 1090 680 1130 695";
const fastPath =
  "M 185 275 C 300 350 390 540 598 565 S 800 565 942 545 S 1050 605 1130 695";

export function buildDemoRoute(input: RouteInput): PlannedRoute {
  const reverse =
    input.source.toLowerCase().includes("pune") &&
    input.destination.toLowerCase().includes("mumbai");
  const forward =
    input.source.toLowerCase().includes("mumbai") &&
    input.destination.toLowerCase().includes("pune");
  if (!forward && !reverse)
    throw new Error(
      "This preview supports Mumbai ↔ Pune. Try either city as your starting point and the other as your destination.",
    );
  const distance = input.preference === "charging" ? 148 : 142;
  let stations = demoStations.filter((s) =>
    s.chargers.some((c) => c.connector === input.connector),
  );
  if (input.preference === "fastest")
    stations = stations.filter((s) =>
      ["panvel", "khopoli", "wakad"].includes(s.id),
    );
  if (reverse)
    stations = stations.map((s) => ({
      ...s,
      distanceAlongRoute: distance - s.distanceAlongRoute,
    }));
  stations = [...stations].sort(
    (a, b) => a.distanceAlongRoute - b.distanceAlongRoute,
  );
  const reachable = stations.find(
    (s) =>
      s.available > 0 &&
      s.distanceAlongRoute <= (input.battery / 100) * 320 - 16,
  );
  const needsStop = input.battery - (distance / 320) * 100 < 25;
  if (needsStop && !reachable)
    throw new Error(
      "No compatible station is safely reachable at this battery level. Increase the starting charge or choose another connector.",
    );
  const stop = needsStop
    ? stations.find(
        (s) =>
          s.recommended &&
          s.available > 0 &&
          s.distanceAlongRoute <= (input.battery / 100) * 320 - 16,
      ) || reachable
    : null;
  const arrivalAtStop = stop
    ? Math.round(input.battery - (stop.distanceAlongRoute / 320) * 100)
    : 0;
  const energy = stop ? ((80 - arrivalAtStop) / 100) * 50 : 0;
  const selectedCharger = stop?.chargers.find(
    (c) => c.connector === input.connector,
  );
  const price = selectedCharger?.price || 0;
  const chargeMinutes = stop
    ? Math.max(
        20,
        Math.ceil(((energy / (selectedCharger?.power || 50)) * 60 * 1.15) / 5) *
          5,
      )
    : 0;
  return {
    id: `demo-${Date.now()}`,
    source: input.source,
    destination: input.destination,
    distance,
    driveMinutes: input.preference === "charging" ? 192 : 178,
    arrivalBattery: Math.max(
      0,
      Math.round(
        stop
          ? 80 - ((distance - stop.distanceAlongRoute) / 320) * 100
          : input.battery - (distance / 320) * 100,
      ),
    ),
    chargeMinutes,
    estimatedCost: Math.round(energy * price),
    stops: stop
      ? [
          {
            stationId: stop.id,
            batteryOnArrival: arrivalAtStop,
            targetBattery: 80,
            minutes: chargeMinutes,
          },
        ]
      : [],
    stations,
    mapPath: input.preference === "charging" ? normalPath : fastPath,
    isDemo: true,
  };
}
export const availabilityLabel = {
  available: "Available",
  filling: "Fast filling",
  full: "Full",
};
export const availabilityStyle = {
  available: "text-emerald-300 bg-emerald-400/10",
  filling: "text-amber-300 bg-amber-400/10",
  full: "text-rose-300 bg-rose-400/10",
};
export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
export const duration = (value: number) =>
  `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
