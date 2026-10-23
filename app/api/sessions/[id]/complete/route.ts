export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { energy_kwh, battery_end_pct } = await req.json();

    const db = getDb();
    const session = db.prepare("SELECT * FROM charging_sessions WHERE id = ? AND user_id = ?").get(params.id, auth.userId) as any;
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.status === "completed" || session.status === "stopped") {
      return NextResponse.json({ error: "Session is already ended" }, { status: 400 });
    }

    const endTime = new Date().toISOString();
    const startMs = new Date(session.start_time).getTime();
    const endMs = new Date(endTime).getTime();
    const durationMinutes = Math.round((endMs - startMs) / 60000 * 10) / 10;

    // Get charger pricing
    const charger = db.prepare("SELECT * FROM chargers WHERE id = ?").get(session.charger_id) as any;
    const actualEnergy = energy_kwh || Math.round((charger.power_kw * durationMinutes / 60) * 10) / 10;
    const cost = Math.round((actualEnergy * charger.price_per_kwh + charger.session_fee) * 100) / 100;

    db.prepare(`
      UPDATE charging_sessions
      SET end_time = ?, energy_kwh = ?, duration_minutes = ?, cost = ?, status = 'completed', battery_end_pct = ?
      WHERE id = ?
    `).run(endTime, actualEnergy, durationMinutes, cost, battery_end_pct || null, params.id);

    // Free up charger
    db.prepare("UPDATE chargers SET status = 'available' WHERE id = ?").run(session.charger_id);

    return NextResponse.json({
      session: {
        id: params.id,
        status: "completed",
        start_time: session.start_time,
        end_time: endTime,
        duration_minutes: durationMinutes,
        energy_kwh: actualEnergy,
        cost,
        battery_start_pct: session.battery_start_pct,
        battery_end_pct: battery_end_pct || null,
      }
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
