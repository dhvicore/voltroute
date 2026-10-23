export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const db = getDb();
    const charger = db.prepare(`
      SELECT c.*, s.name as station_name, s.operator
      FROM chargers c JOIN stations s ON s.id = c.station_id
      WHERE c.id = ?
    `).get(params.id) as any;

    if (!charger) return NextResponse.json({ error: "Charger not found" }, { status: 404 });

    // Calculate estimated costs for different durations
    const estimates = [15, 30, 45, 60].map(minutes => {
      const energyKwh = Math.round((charger.power_kw * minutes / 60) * 10) / 10;
      const energyCost = Math.round(energyKwh * charger.price_per_kwh * 100) / 100;
      const totalCost = Math.round((energyCost + charger.session_fee) * 100) / 100;
      return { duration_minutes: minutes, estimated_energy_kwh: energyKwh, energy_cost: energyCost, session_fee: charger.session_fee, total_cost: totalCost };
    });

    return NextResponse.json({
      charger_id: charger.id,
      station_name: charger.station_name,
      operator: charger.operator,
      connector_type: charger.connector_type,
      power_kw: charger.power_kw,
      price_per_kwh: charger.price_per_kwh,
      session_fee: charger.session_fee,
      idle_fee_per_min: charger.idle_fee_per_min,
      estimates,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
