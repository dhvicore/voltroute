export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const db = getDb();
    const station = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id) as total_chargers,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers
      FROM stations s WHERE s.id = ?
    `).get(params.id) as any;

    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    const chargers = db.prepare("SELECT * FROM chargers WHERE station_id = ?").all(params.id);
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.station_id = ? ORDER BY r.created_at DESC
    `).all(params.id);

    return NextResponse.json({
      station: { ...station, amenities: JSON.parse(station.amenities || "[]") },
      chargers,
      reviews,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
