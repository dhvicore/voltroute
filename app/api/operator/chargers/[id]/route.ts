export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { managedStationIds } from "@/lib/planner-stations";
import { chargerFields, markVerified } from "@/lib/operator-chargers";

// PATCH /api/operator/chargers/:id — update type, power, price or live status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const charger = db.prepare("SELECT station_id FROM chargers WHERE id = ?").get(params.id) as
      | { station_id: string }
      | undefined;
    const managed = managedStationIds(auth.userId, auth.role);
    if (!charger || (managed !== "all" && !managed.includes(charger.station_id)))
      return NextResponse.json({ error: "Charger not found" }, { status: 404 });
    const body = await req.json().catch(() => null);
    const fields = chargerFields(body, false);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    db.transaction(() => {
      db.prepare(`UPDATE chargers SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`).run(
        ...entries.map(([, v]) => v),
        params.id,
      );
      markVerified(charger.station_id);
    })();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
