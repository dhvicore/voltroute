// Keeps the route planner's stations in the database so planner bookings are
// real rows that station operators can see. Safe to run on every start.
import bcryptjs from "bcryptjs";
import { v4 as uuid } from "uuid";
import { getDb } from "./db";
import { demoStations } from "@/components/planner/demo-data";

const coordinates: Record<string, [number, number]> = {
  khalapur: [18.8336, 73.2831],
  lonavala: [18.7546, 73.4062],
  talegaon: [18.7357, 73.6755],
  panvel: [18.9894, 73.1175],
  khopoli: [18.7856, 73.3459],
  wakad: [18.5983, 73.7638],
};

// Development operator accounts, one per planner station.
const operators = [
  {
    stationId: "khalapur",
    name: "Khalapur Station Admin",
    email: "khalapur.admin@voltroute.app",
    password: "operator123",
  },
];

export function ensurePlannerStations() {
  const db = getDb();
  const insertStation = db.prepare(`
    INSERT OR IGNORE INTO stations (id, name, operator, address, city, latitude, longitude, amenities, rating, rating_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCharger = db.prepare(`
    INSERT OR IGNORE INTO chargers (id, station_id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  db.transaction(() => {
    for (const station of demoStations) {
      const [lat, lng] = coordinates[station.id] ?? [18.9, 73.3];
      const city = station.address.split(/[,·]/).pop()?.trim() || station.name;
      insertStation.run(
        station.id,
        station.name,
        station.operator,
        station.address,
        city,
        lat,
        lng,
        JSON.stringify(station.amenities),
        station.rating,
        station.reviews,
      );
      for (const charger of station.chargers) {
        const connector = charger.connector === "Type 2" ? "Type2" : charger.connector;
        insertCharger.run(
          charger.id,
          station.id,
          connector,
          charger.power,
          connector === "Type2" ? "AC" : "DC",
          charger.available ? "available" : "out_of_service",
          charger.price,
          charger.sessionFee,
        );
      }
    }
    for (const operator of operators) {
      let user = db
        .prepare("SELECT id FROM users WHERE lower(email) = ?")
        .get(operator.email) as { id: string } | undefined;
      if (!user) {
        user = { id: uuid() };
        db.prepare(
          "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        ).run(user.id, operator.name, operator.email, bcryptjs.hashSync(operator.password, 10));
      }
      db.prepare(
        "INSERT OR IGNORE INTO station_managers (user_id, station_id) VALUES (?, ?)",
      ).run(user.id, operator.stationId);
    }
  })();
}

export function managedStationIds(userId: string, role: string): string[] | "all" {
  if (role === "admin") return "all";
  return (
    getDb()
      .prepare("SELECT station_id FROM station_managers WHERE user_id = ?")
      .all(userId) as { station_id: string }[]
  ).map((row) => row.station_id);
}

export function isStationOperator(userId: string, role: string) {
  const ids = managedStationIds(userId, role);
  return ids === "all" || ids.length > 0;
}
