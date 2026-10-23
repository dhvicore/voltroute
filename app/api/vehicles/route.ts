export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

// GET /api/vehicles — list user's vehicles
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const vehicles = db.prepare("SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC").all(auth.userId);
    const result = vehicles.map((v: any) => ({
      ...v,
      connector_types: JSON.parse(v.connector_types || "[]"),
    }));
    return NextResponse.json({ vehicles: result });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/vehicles — add a vehicle
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { make, model, year, battery_capacity_kwh, connector_types, max_charging_power_kw, current_range_km } = await req.json();

    if (!make || !model || !battery_capacity_kwh) {
      return NextResponse.json({ error: "make, model, and battery_capacity_kwh are required" }, { status: 400 });
    }

    const db = getDb();
    const id = uuid();
    db.prepare(`
      INSERT INTO vehicles (id, user_id, make, model, year, battery_capacity_kwh, connector_types, max_charging_power_kw, current_range_km)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, auth.userId, make, model, year || null, battery_capacity_kwh,
      JSON.stringify(connector_types || ["CCS2"]), max_charging_power_kw || 50, current_range_km || null);

    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id) as any;
    return NextResponse.json({
      vehicle: { ...vehicle, connector_types: JSON.parse(vehicle.connector_types) }
    }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
