export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { managedStationIds } from "@/lib/planner-stations";
import { chargerFields, markVerified } from "@/lib/operator-chargers";

function canManage(userId: string, role: string, stationId: string) {
  const managed = managedStationIds(userId, role);
  return managed === "all" || managed.includes(stationId);
}

// GET /api/operator/chargers?station_id= — chargers at a station this user manages
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const stationId = new URL(req.url).searchParams.get("station_id") || "";
    if (!canManage(auth.userId, auth.role, stationId))
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    const db = getDb();
    const station = db
      .prepare("SELECT id, name, operator_verified, status_updated_at FROM stations WHERE id = ?")
      .get(stationId);
    const chargers = db
      .prepare(
        "SELECT id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee FROM chargers WHERE station_id = ? ORDER BY created_at, id",
      )
      .all(stationId);
    return NextResponse.json({ station, chargers });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/operator/chargers — add a charger { station_id, connector_type, power_kw, price_per_kwh, status }
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json().catch(() => null);
    const stationId = typeof body?.station_id === "string" ? body.station_id : "";
    if (!canManage(auth.userId, auth.role, stationId))
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    const fields = chargerFields(body, true);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
    const db = getDb();
    const id = `${stationId}-${uuid().slice(0, 8)}`;
    db.transaction(() => {
      db.prepare(
        `INSERT INTO chargers (id, station_id, connector_type, power_kw, charging_type, status, price_per_kwh, session_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, stationId, fields.connector_type, fields.power_kw, fields.charging_type, fields.status, fields.price_per_kwh, fields.session_fee ?? 0);
      markVerified(stationId);
    })();
    return NextResponse.json({ id }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
