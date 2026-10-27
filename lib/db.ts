import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), "voltroute.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
  }
  return _db;
}

function addColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      operator TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'Maharashtra',
      postal_code TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      amenities TEXT DEFAULT '[]',
      opening_hours TEXT DEFAULT '24/7',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      contact_phone TEXT,
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chargers (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      connector_type TEXT NOT NULL CHECK(connector_type IN ('CCS2','Type2','CHAdeMO','NACS')),
      power_kw REAL NOT NULL,
      charging_type TEXT NOT NULL CHECK(charging_type IN ('AC','DC')),
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','reserved','out_of_service')),
      price_per_kwh REAL NOT NULL,
      session_fee REAL DEFAULT 0,
      idle_fee_per_min REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      battery_capacity_kwh REAL NOT NULL,
      connector_types TEXT NOT NULL DEFAULT '["CCS2"]',
      max_charging_power_kw REAL DEFAULT 50,
      current_range_km REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id TEXT NOT NULL REFERENCES stations(id),
      charger_id TEXT NOT NULL REFERENCES chargers(id),
      vehicle_id TEXT REFERENCES vehicles(id),
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','completed','cancelled','no_show')),
      estimated_cost REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS charging_sessions (
      id TEXT PRIMARY KEY,
      booking_id TEXT REFERENCES bookings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      station_id TEXT NOT NULL REFERENCES stations(id),
      charger_id TEXT NOT NULL REFERENCES chargers(id),
      vehicle_id TEXT REFERENCES vehicles(id),
      start_time TEXT,
      end_time TEXT,
      energy_kwh REAL DEFAULT 0,
      duration_minutes REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'started' CHECK(status IN ('started','charging','completed','stopped')),
      power_kw REAL DEFAULT 0,
      battery_start_pct REAL,
      battery_end_pct REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, station_id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_stations_city ON stations(city);
    CREATE INDEX IF NOT EXISTS idx_stations_enabled ON stations(is_enabled);
    CREATE INDEX IF NOT EXISTS idx_chargers_station ON chargers(station_id);
    CREATE INDEX IF NOT EXISTS idx_chargers_status ON chargers(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_charger_date ON bookings(charger_id, booking_date);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON charging_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);


    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL CHECK(plan IN ('basic','plus','max')),
      price REAL NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rewards (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'Bronze' CHECK(tier IN ('Bronze','Silver','Gold','Platinum')),
      total_earned INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      earned INTEGER NOT NULL DEFAULT 0,
      earned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS community_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id TEXT NOT NULL REFERENCES stations(id),
      category TEXT NOT NULL CHECK(category IN ('broken','icing','pricing','safety','other')),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','investigating','verified','resolved','dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );


    CREATE TABLE IF NOT EXISTS station_managers (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, station_id)
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_station_date ON bookings(station_id, booking_date);
    CREATE INDEX IF NOT EXISTS idx_community_user ON community_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_community_station ON community_reports(station_id);
    CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
  `);
  // 1 when connector types and power were assumed rather than listed by the source.
  addColumn(db, "stations", "chargers_estimated", "INTEGER NOT NULL DEFAULT 1");
  // 1 once the station provider has set its own chargers, prices and status.
  addColumn(db, "stations", "operator_verified", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "stations", "status_updated_at", "TEXT");
  // Stations found through Google Places; live_status = 1 when Google reports live charger availability.
  addColumn(db, "stations", "live_source", "TEXT");
  addColumn(db, "stations", "live_updated_at", "TEXT");
  addColumn(db, "stations", "live_status", "INTEGER NOT NULL DEFAULT 0");
  // Demo deposit payments (no real money moves).
  addColumn(db, "bookings", "deposit_amount", "REAL NOT NULL DEFAULT 0");
  addColumn(db, "bookings", "payment_status", "TEXT NOT NULL DEFAULT 'unpaid'");
  addColumn(db, "bookings", "payment_ref", "TEXT");
  addColumn(db, "bookings", "payment_method", "TEXT");
  addColumn(db, "bookings", "reminder_sent", "INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
  `);
  // Drivers request a slot; the station accepts or declines it.
  addColumn(db, "bookings", "operator_status", "TEXT NOT NULL DEFAULT 'pending'");
}
