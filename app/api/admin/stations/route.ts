export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

// GET /api/admin/stations — list all stations (including disabled)
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    requireAdmin(req);
    const db = getDb();
    const stations = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id) as total_chargers,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers
      FROM stations s ORDER BY s.created_at DESC
    `).all();

    const result = stations.map((s: any) => ({
      ...s,
      amenities: JSON.parse(s.amenities || "[]"),
    }));

    return NextResponse.json({ stations: result });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "Forbidden") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/admin/stations — add a new station
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    requireAdmin(req);
    const body = await req.json();

    const { name, operator, address, city, state, postal_code, latitude, longitude, amenities, opening_hours, is_enabled, contact_phone } = body;
    if (!name || !address || !city || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "name, address, city, latitude, and longitude are required" }, { status: 400 });
    }

    const db = getDb();
    const id = uuid();
    db.prepare(`
      INSERT INTO stations (id, name, operator, address, city, state, postal_code, latitude, longitude, amenities, opening_hours, is_enabled, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, operator || null, address, city, state || "Maharashtra", postal_code || null,
      latitude, longitude, JSON.stringify(amenities || []), opening_hours || "24/7",
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1, contact_phone || null);

    // Add chargers if provided
    if (body.chargers && Array.isArray(body.chargers)) {
      const stmt = db.prepare(`
        INSERT INTO chargers (id, station_id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee, idle_fee_per_min)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of body.chargers) {
        stmt.run(uuid(), id, c.connector_type || "CCS2", c.power_kw || 60, c.charging_type || "DC",
          "available", c.price_per_kwh || 15, c.session_fee || 20, c.idle_fee_per_min || 2);
      }
    }

    const station = db.prepare("SELECT * FROM stations WHERE id = ?").get(id) as any;
    return NextResponse.json({
      station: { ...station, amenities: JSON.parse(station.amenities) }
    }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (e.message === "Forbidden") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
