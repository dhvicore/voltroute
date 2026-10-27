export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

// POST /api/operator/seen — mark every booking at the user's stations as seen
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    getDb()
      .prepare("UPDATE station_managers SET last_seen_at = datetime('now') WHERE user_id = ?")
      .run(auth.userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
