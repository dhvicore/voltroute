export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const radiusKm = Number(url.searchParams.get("radius") || "10");

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const db = getDb();

    // Haversine approximation using SQLite math
    // 1 degree lat ≈ 111km, 1 degree lng ≈ 111km * cos(lat)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const stations = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers,
        (SELECT MIN(c.price_per_kwh) FROM chargers c WHERE c.station_id = s.id) as min_price,
        (SELECT MAX(c.power_kw) FROM chargers c WHERE c.station_id = s.id) as max_power,
        ROUND(
          111.0 * SQRT(
            (s.latitude - ?) * (s.latitude - ?) +
            (s.longitude - ?) * (s.longitude - ?) * COS(? * 3.14159 / 180) * COS(? * 3.14159 / 180)
          ), 1
        ) as distance_km
      FROM stations s
      WHERE s.is_enabled = 1
        AND s.latitude BETWEEN ? AND ?
        AND s.longitude BETWEEN ? AND ?
      ORDER BY distance_km ASC
    `).all(lat, lat, lng, lng, lat, lat,
      lat - latDelta, lat + latDelta,
      lng - lngDelta, lng + lngDelta);

    const result = stations.map((s: any) => ({
      ...s,
      amenities: JSON.parse(s.amenities || "[]"),
    }));

    return NextResponse.json({ stations: result, count: result.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
