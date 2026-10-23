export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

// PUT /api/vehicles/:id — update a vehicle
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const existing = db.prepare("SELECT * FROM vehicles WHERE id = ? AND user_id = ?").get(params.id, auth.userId) as any;
    if (!existing) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    const body = await req.json();
    const updates: string[] = [];
    const values: any[] = [];

    for (const field of ["make", "model", "year", "battery_capacity_kwh", "max_charging_power_kw", "current_range_km"]) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (body.connector_types) {
      updates.push("connector_types = ?");
      values.push(JSON.stringify(body.connector_types));
    }

    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(params.id);

    db.prepare(`UPDATE vehicles SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(params.id) as any;
    return NextResponse.json({ vehicle: { ...vehicle, connector_types: JSON.parse(vehicle.connector_types) } });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/vehicles/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const result = db.prepare("DELETE FROM vehicles WHERE id = ? AND user_id = ?").run(params.id, auth.userId);
    if (result.changes === 0) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    return NextResponse.json({ message: "Vehicle deleted" });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
