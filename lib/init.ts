// Ensure database is initialized and seeded on first API request
import { getDb } from "./db";
import { seedDatabase } from "./seed";
import { ensurePlannerStations } from "./planner-stations";

let initialized = false;

export function ensureInit() {
  if (!initialized) {
    getDb();
    seedDatabase();
    ensurePlannerStations();
    initialized = true;
  }
}
