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
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
      )
      .get(auth.userId) as any;
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const stats = db
      .prepare(
        `
      SELECT
        (SELECT COUNT(*) FROM bookings WHERE user_id = ?) as total_bookings,
        (SELECT COUNT(*) FROM charging_sessions WHERE user_id = ?) as total_sessions,
        (SELECT COALESCE(SUM(energy_kwh), 0) FROM charging_sessions WHERE user_id = ? AND status = 'completed') as total_energy_kwh,
        (SELECT COALESCE(SUM(cost), 0) FROM charging_sessions WHERE user_id = ? AND status = 'completed') as total_spent,
        (SELECT COUNT(*) FROM vehicles WHERE user_id = ?) as total_vehicles
    `,
      )
      .get(
        auth.userId,
        auth.userId,
        auth.userId,
        auth.userId,
        auth.userId,
      ) as any;

    return NextResponse.json({ user, stats });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/profile — update profile
export async function PUT(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json(
        { error: "Enter valid profile details" },
        { status: 400 },
      );
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 100)
    )
      return NextResponse.json(
        { error: "Your name must contain 1 to 100 characters" },
        { status: 400 },
      );
    if (
      body.phone !== undefined &&
      (typeof body.phone !== "string" || body.phone.length > 20)
    )
      return NextResponse.json(
        { error: "Phone number must contain up to 20 characters" },
        { status: 400 },
      );
    if (
      body.password !== undefined &&
      (typeof body.password !== "string" ||
        body.password.length < 8 ||
        Buffer.byteLength(body.password, "utf8") > 72)
    )
      return NextResponse.json(
        { error: "Use a password of at least 8 characters and up to 72 bytes" },
        { status: 400 },
      );
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name.trim());
    }
    if (body.phone !== undefined) {
      updates.push("phone = ?");
      values.push(body.phone.trim() || null);
    }
    if (body.password) {
      updates.push("password_hash = ?");
      values.push(bcryptjs.hashSync(body.password, 10));
    }

    if (updates.length === 0)
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );

    updates.push("updated_at = datetime('now')");
    values.push(auth.userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );

    const user = db
      .prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?")
      .get(auth.userId);
    return NextResponse.json({ user });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
