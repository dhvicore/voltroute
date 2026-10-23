export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const db = getDb();
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const charger = db.prepare("SELECT * FROM chargers WHERE id = ?").get(params.id) as any;
    if (!charger) return NextResponse.json({ error: "Charger not found" }, { status: 404 });

    // Get existing bookings for this charger on the requested date
    const bookings = db.prepare(`
      SELECT start_time, end_time, duration_minutes, status
      FROM bookings
      WHERE charger_id = ? AND booking_date = ? AND status IN ('confirmed','completed')
      ORDER BY start_time ASC
    `).all(params.id, date);

    return NextResponse.json({
      charger_id: charger.id,
      status: charger.status,
      connector_type: charger.connector_type,
      power_kw: charger.power_kw,
      date,
      booked_slots: bookings,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
