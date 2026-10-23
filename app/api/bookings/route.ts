export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

// GET /api/bookings — list current user's bookings
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    let query = `
      SELECT b.*, s.name as station_name, s.address as station_address, s.city,
        c.connector_type, c.power_kw, c.charging_type
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN chargers c ON c.id = b.charger_id
      WHERE b.user_id = ?
    `;
    const params: any[] = [auth.userId];

    if (status) {
      query += " AND b.status = ?";
      params.push(status);
    }
    query += " ORDER BY b.booking_date DESC, b.start_time DESC";

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json({ bookings });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/bookings — create a booking
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Request body must contain valid JSON" }, { status: 400 });
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
    }
    const { station_id, charger_id, vehicle_id, booking_date, start_time, duration_minutes } = body as Record<string, any>;

    if (!station_id || !charger_id || !booking_date || !start_time || !duration_minutes) {
      return NextResponse.json({ error: "station_id, charger_id, booking_date, start_time, and duration_minutes are required" }, { status: 400 });
    }

    if (typeof station_id !== "string" || !station_id.trim() || typeof charger_id !== "string" || !charger_id.trim()) {
      return NextResponse.json({ error: "Station and charger IDs must be non-empty strings" }, { status: 400 });
    }
    if (vehicle_id != null && vehicle_id !== "" && (typeof vehicle_id !== "string" || !vehicle_id.trim())) {
      return NextResponse.json({ error: "Vehicle ID must be a non-empty string when provided" }, { status: 400 });
    }

    if (typeof duration_minutes !== "number" || !Number.isInteger(duration_minutes) || duration_minutes < 10 || duration_minutes > 120) {
      return NextResponse.json({ error: "Duration must be a whole number between 10 and 120 minutes" }, { status: 400 });
    }

    if (typeof booking_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
      return NextResponse.json({ error: "Booking date must use YYYY-MM-DD format" }, { status: 400 });
    }
    const calendarDate = new Date(`${booking_date}T00:00:00Z`);
    if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== booking_date) {
      return NextResponse.json({ error: "Booking date must be a valid calendar date" }, { status: 400 });
    }
    if (typeof start_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time)) {
      return NextResponse.json({ error: "Start time must be a valid 24-hour time in HH:mm format" }, { status: 400 });
    }
    // The application's charging stations use India Standard Time.
    const startsAt = new Date(`${booking_date}T${start_time}:00+05:30`);
    if (startsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Bookings must start in the future" }, { status: 400 });
    }
    const [hours, mins] = start_time.split(":").map(Number);
    const startMinutes = hours * 60 + mins;
    const endMinutes = startMinutes + duration_minutes;
    if (endMinutes >= 24 * 60) {
      return NextResponse.json({ error: "A booking must finish before midnight on the selected date" }, { status: 400 });
    }

    const db = getDb();

    const station = db.prepare("SELECT is_enabled FROM stations WHERE id = ?").get(station_id) as { is_enabled: number } | undefined;
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
    if (!station.is_enabled) return NextResponse.json({ error: "This station is not accepting bookings" }, { status: 400 });

    if (vehicle_id) {
      const vehicle = db.prepare("SELECT id FROM vehicles WHERE id = ? AND user_id = ?").get(vehicle_id, auth.userId);
      if (!vehicle) return NextResponse.json({ error: "Vehicle not found in your account" }, { status: 404 });
    }

    // Validate station and charger exist
    const charger = db.prepare("SELECT * FROM chargers WHERE id = ? AND station_id = ?").get(charger_id, station_id) as any;
    if (!charger) return NextResponse.json({ error: "Charger not found at this station" }, { status: 404 });

    if (charger.status === "out_of_service") {
      return NextResponse.json({ error: "Charger is out of service" }, { status: 400 });
    }

    // Calculate end time
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const end_time = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

    // Check for overlapping bookings
    const overlap = db.prepare(`
      SELECT id FROM bookings
      WHERE charger_id = ? AND booking_date = ? AND status = 'confirmed'
        AND start_time < ? AND end_time > ?
    `).get(charger_id, booking_date, end_time, start_time);

    if (overlap) {
      return NextResponse.json({ error: "Time slot conflicts with an existing booking" }, { status: 409 });
    }

    // Calculate estimated cost
    const energyKwh = Math.round((charger.power_kw * duration_minutes / 60) * 10) / 10;
    const estimated_cost = Math.round((energyKwh * charger.price_per_kwh + charger.session_fee) * 100) / 100;

    const id = uuid();
    db.prepare(`
      INSERT INTO bookings (id, user_id, station_id, charger_id, vehicle_id, booking_date, start_time, end_time, duration_minutes, estimated_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, auth.userId, station_id, charger_id, vehicle_id || null, booking_date, start_time, end_time, duration_minutes, estimated_cost);

    const booking = db.prepare(`
      SELECT b.*, s.name as station_name, c.connector_type, c.power_kw
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN chargers c ON c.id = b.charger_id
      WHERE b.id = ?
    `).get(id);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
