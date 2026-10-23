export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { booking_id, charger_id, station_id, vehicle_id, battery_start_pct } = await req.json();

    if (!charger_id || !station_id) {
      return NextResponse.json({ error: "charger_id and station_id are required" }, { status: 400 });
    }

    const db = getDb();

    const charger = db.prepare("SELECT * FROM chargers WHERE id = ?").get(charger_id) as any;
    if (!charger) return NextResponse.json({ error: "Charger not found" }, { status: 404 });

    if (charger.status !== "available" && charger.status !== "reserved") {
      return NextResponse.json({ error: `Charger is currently ${charger.status}` }, { status: 400 });
    }

    // Mark charger as occupied
    db.prepare("UPDATE chargers SET status = 'occupied' WHERE id = ?").run(charger_id);

    const sessionId = uuid();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO charging_sessions (id, booking_id, user_id, station_id, charger_id, vehicle_id, start_time, status, power_kw, battery_start_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'charging', ?, ?)
    `).run(sessionId, booking_id || null, auth.userId, station_id, charger_id, vehicle_id || null, now, charger.power_kw, battery_start_pct || null);

    // Update booking status if linked
    if (booking_id) {
      db.prepare("UPDATE bookings SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(booking_id);
    }

    return NextResponse.json({
      session: {
        id: sessionId,
        status: "charging",
        start_time: now,
        charger_id,
        station_id,
        power_kw: charger.power_kw,
        price_per_kwh: charger.price_per_kwh,
      }
    }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
