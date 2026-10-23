export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();

    const sessions = db.prepare(`
      SELECT cs.*, s.name as station_name, s.address as station_address,
        c.connector_type, c.power_kw as charger_power_kw
      FROM charging_sessions cs
      JOIN stations s ON s.id = cs.station_id
      JOIN chargers c ON c.id = cs.charger_id
      WHERE cs.user_id = ?
      ORDER BY cs.created_at DESC
    `).all(auth.userId);

    return NextResponse.json({ sessions });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
