export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    if (!q) return NextResponse.json({ error: "Search query 'q' is required" }, { status: 400 });

    const db = getDb();
    const term = `%${q}%`;
    const stations = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers,
        (SELECT MIN(c.price_per_kwh) FROM chargers c WHERE c.station_id = s.id) as min_price
      FROM stations s
      WHERE s.is_enabled = 1
        AND (LOWER(s.name) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?) OR LOWER(s.address) LIKE LOWER(?) OR LOWER(s.operator) LIKE LOWER(?))
      ORDER BY s.rating DESC
    `).all(term, term, term, term);

    const result = stations.map((s: any) => ({
      ...s,
      amenities: JSON.parse(s.amenities || "[]"),
    }));

    return NextResponse.json({ stations: result, count: result.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
