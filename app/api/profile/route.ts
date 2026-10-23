export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import bcryptjs from "bcryptjs";

// GET /api/profile
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const user = db.prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?").get(auth.userId) as any;
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE user_id = ?) as total_bookings,
        (SELECT COUNT(*) FROM charging_sessions WHERE user_id = ?) as total_sessions,
        (SELECT COALESCE(SUM(energy_kwh), 0) FROM charging_sessions WHERE user_id = ? AND status = 'completed') as total_energy_kwh,
        (SELECT COALESCE(SUM(cost), 0) FROM charging_sessions WHERE user_id = ? AND status = 'completed') as total_spent,
        (SELECT COUNT(*) FROM vehicles WHERE user_id = ?) as total_vehicles
    `).get(auth.userId, auth.userId, auth.userId, auth.userId, auth.userId) as any;

    return NextResponse.json({ user, stats });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/profile — update profile
export async function PUT(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json();
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name) { updates.push("name = ?"); values.push(body.name); }
    if (body.phone) { updates.push("phone = ?"); values.push(body.phone); }
    if (body.password) {
      updates.push("password_hash = ?");
      values.push(bcryptjs.hashSync(body.password, 10));
    }

    if (updates.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(auth.userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const user = db.prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?").get(auth.userId);
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
