export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { managedStationIds } from "@/lib/planner-stations";

// GET /api/operator/bookings — bookings at the stations this user manages
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const managed = managedStationIds(auth.userId, auth.role);
    if (managed !== "all" && managed.length === 0)
      return NextResponse.json({ error: "Station operator access required" }, { status: 403 });

    const stations = (
      managed === "all"
        ? db.prepare(`
            SELECT s.id, s.name, s.address, NULL as last_seen_at FROM stations s
            WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.station_id = s.id)
              OR s.id IN (SELECT station_id FROM station_managers)
            ORDER BY s.name`).all()
        : db.prepare(`
            SELECT s.id, s.name, s.address, m.last_seen_at FROM station_managers m
            JOIN stations s ON s.id = m.station_id
            WHERE m.user_id = ? ORDER BY s.name`).all(auth.userId)
    ) as { id: string; name: string; address: string; last_seen_at: string | null }[];

    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    const requested = url.searchParams.get("station_id");
    const ids = stations.map((s) => s.id).filter((id) => !requested || id === requested);
    if (ids.length === 0) return NextResponse.json({ stations, bookings: [] });

    let query = `
      SELECT b.id, b.station_id, b.booking_date, b.start_time, b.end_time, b.duration_minutes,
        b.status, b.operator_status, b.estimated_cost, b.created_at, b.deposit_amount, b.payment_status, b.payment_method,
        s.name as station_name, u.name as user_name, u.email as user_email, u.phone as user_phone,
        c.connector_type, c.power_kw, v.make as vehicle_make, v.model as vehicle_model,
        (m.last_seen_at IS NOT NULL AND b.created_at > m.last_seen_at) as is_new
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN users u ON u.id = b.user_id
      JOIN chargers c ON c.id = b.charger_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id
      LEFT JOIN station_managers m ON m.station_id = b.station_id AND m.user_id = ?
      WHERE b.station_id IN (${ids.map(() => "?").join(",")})
    `;
    const params: string[] = [auth.userId, ...ids];
    if (date) {
      query += " AND b.booking_date = ?";
      params.push(date);
    }
    query += " ORDER BY b.booking_date ASC, b.start_time ASC";

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json({ stations, bookings });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
