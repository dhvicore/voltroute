export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const db = getDb();
    const url = new URL(req.url);

    // Query parameters for filtering
    const city = url.searchParams.get("city");
    const connector = url.searchParams.get("connector");
    const minPower = url.searchParams.get("min_power");
    const maxPrice = url.searchParams.get("max_price");
    const available = url.searchParams.get("available");
    const amenity = url.searchParams.get("amenity");
    const operator = url.searchParams.get("operator");

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id) as total_chargers,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers,
        (SELECT MIN(c.price_per_kwh) FROM chargers c WHERE c.station_id = s.id) as min_price,
        (SELECT MAX(c.power_kw) FROM chargers c WHERE c.station_id = s.id) as max_power
      FROM stations s
      WHERE s.is_enabled = 1
    `;
    const params: any[] = [];

    if (city) {
      query += " AND LOWER(s.city) = LOWER(?)";
      params.push(city);
    }
    if (operator) {
      query += " AND LOWER(s.operator) LIKE LOWER(?)";
      params.push(`%${operator}%`);
    }
    if (connector) {
      query += " AND EXISTS (SELECT 1 FROM chargers c WHERE c.station_id = s.id AND c.connector_type = ?)";
      params.push(connector);
    }
    if (minPower) {
      query += " AND EXISTS (SELECT 1 FROM chargers c WHERE c.station_id = s.id AND c.power_kw >= ?)";
      params.push(Number(minPower));
    }
    if (maxPrice) {
      query += " AND EXISTS (SELECT 1 FROM chargers c WHERE c.station_id = s.id AND c.price_per_kwh <= ?)";
      params.push(Number(maxPrice));
    }
    if (available === "true") {
      query += " AND EXISTS (SELECT 1 FROM chargers c WHERE c.station_id = s.id AND c.status = 'available')";
    }
    if (amenity) {
      query += " AND s.amenities LIKE ?";
      params.push(`%${amenity}%`);
    }

    query += " ORDER BY s.rating DESC";

    const stations = db.prepare(query).all(...params);

    // Parse JSON fields
    const result = stations.map((s: any) => ({
      ...s,
      amenities: JSON.parse(s.amenities || "[]"),
    }));

    return NextResponse.json({ stations: result, count: result.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
