// Ensure database is initialized and seeded on first API request
import { getDb } from "./db";
import { seedDatabase } from "./seed";

let initialized = false;

export function ensureInit() {
  if (!initialized) {
    getDb();
    seedDatabase();
    initialized = true;
  }
}
