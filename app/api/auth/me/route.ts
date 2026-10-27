export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { isStationOperator } from "@/lib/planner-stations";

export async function GET(req: NextRequest) {
  try {
    ensureInit();
    const auth = requireAuth(req);
    const db = getDb();
    const user = db
      .prepare(
        "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
      )
      .get(auth.userId) as any;
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: { ...user, is_operator: isStationOperator(user.id, user.role) },
    });
  } catch (e: any) {
    if (e.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
