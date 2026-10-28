export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { validateBookingSlot } from "@/lib/booking-slot";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { isStationOperator } from "@/lib/planner-stations";
import { formatSlot, notify, notifyStation } from "@/lib/notify";
import { sampleBusySlots, usesSampleSchedule } from "@/lib/sample-availability";
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
    if (auth.role !== "admin" && isStationOperator(auth.userId, auth.role)) {
      return NextResponse.json({ error: "Station provider accounts can view bookings but not make them. Log in as an EV driver to book." }, { status: 403 });
    }
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

    const slot = validateBookingSlot(booking_date, start_time, duration_minutes);
    if ("error" in slot)
      return NextResponse.json({ error: slot.error }, { status: 400 });
    const { end_time } = slot;

    const db = getDb();

    const station = db.prepare("SELECT is_enabled, chargers_estimated, operator_verified, live_source FROM stations WHERE id = ?").get(station_id) as { is_enabled: number; chargers_estimated: number; operator_verified: number; live_source: string | null } | undefined;
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

    if (usesSampleSchedule(station) && sampleBusySlots(charger_id, booking_date).some(
      (slot) => start_time < slot.end_time && end_time > slot.start_time,
    )) return NextResponse.json({ error: "This sample slot is full. Please choose another time." }, { status: 409 });

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
    // Energy is limited by the slower of charger and car, and by how much the battery can still take.
    const arrival = Number((body as Record<string, any>).arrival_battery);
    const arrivalBattery = Number.isFinite(arrival) && arrival >= 0 && arrival <= 100 ? arrival : 20;
    const car = vehicle_id
      ? (db.prepare("SELECT battery_capacity_kwh, max_charging_power_kw FROM vehicles WHERE id = ? AND user_id = ?").get(vehicle_id, auth.userId) as
          | { battery_capacity_kwh: number; max_charging_power_kw: number | null }
          | undefined)
      : undefined;
    const carKw = car ? (charger.charging_type === "AC" ? 7.2 : car.max_charging_power_kw || 7.2) : charger.power_kw;
    const energyKwh = Math.round(Math.min((Math.min(charger.power_kw, carKw) * duration_minutes) / 60, car ? (car.battery_capacity_kwh * (100 - arrivalBattery)) / 100 : Infinity) * 10) / 10;
    const estimated_cost = Math.round((energyKwh * charger.price_per_kwh + charger.session_fee) * 100) / 100;

    const id = uuid();
    db.prepare(`
      INSERT INTO bookings (id, user_id, station_id, charger_id, vehicle_id, booking_date, start_time, end_time, duration_minutes, estimated_cost, deposit_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, auth.userId, station_id, charger_id, vehicle_id || null, booking_date, start_time, end_time, duration_minutes, estimated_cost, Math.round(estimated_cost));

    const who = db.prepare("SELECT u.name, s.name as station FROM users u, stations s WHERE u.id = ? AND s.id = ?").get(auth.userId, station_id) as { name: string; station: string };
    notifyStation(station_id, "request", "New booking request", `${who.name} requested ${formatSlot(booking_date, start_time)} (${duration_minutes} min). Accept or decline it.`);
    notify(auth.userId, "request", "Request sent", `Waiting for ${who.station} to accept ${formatSlot(booking_date, start_time)}. No payment is needed while your request is pending.`, "/profile#bookings");

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
