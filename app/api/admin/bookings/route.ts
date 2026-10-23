export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

// GET /api/admin/bookings — list all bookings (admin view)
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    requireAdmin(req);
    const db = getDb();
    const url = new URL(req.url);
    const stationId = url.searchParams.get("station_id");

    let query = `
      SELECT b.*, s.name as station_name, u.name as user_name, u.email as user_email,
        c.connector_type, c.power_kw
      FROM bookings b
      JOIN stations s ON s.id = b.station_id
      JOIN users u ON u.id = b.user_id
      JOIN chargers c ON c.id = b.charger_id
    `;
    const params: any[] = [];

    if (stationId) {
      query += " WHERE b.station_id = ?";
      params.push(stationId);
    }
    query += " ORDER BY b.booking_date DESC, b.start_time DESC";

    const bookings = db.prepare(query).all(...params);
    return NextResponse.json({ bookings });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "Forbidden") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
