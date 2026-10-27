export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sampleBusySlots, usesSampleSchedule } from "@/lib/sample-availability";
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

    const station = db.prepare("SELECT chargers_estimated, operator_verified, live_source FROM stations WHERE id = ?").get(charger.station_id) as { chargers_estimated: number; operator_verified: number; live_source: string | null };
    const sample = station && usesSampleSchedule(station);
    return NextResponse.json({
      charger_id: charger.id,
      status: charger.status,
      connector_type: charger.connector_type,
      power_kw: charger.power_kw,
      date,
      sample_schedule: !!sample,
      booked_slots: [...bookings, ...(sample ? sampleBusySlots(charger.id, date) : [])],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
