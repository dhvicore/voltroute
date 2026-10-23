export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

// DELETE /api/favorites/:stationId — remove a favorite
export async function DELETE(req: NextRequest, { params }: { params: { stationId: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const result = db.prepare("DELETE FROM favorites WHERE user_id = ? AND station_id = ?").run(auth.userId, params.stationId);
    if (result.changes === 0) return NextResponse.json({ error: "Not in favorites" }, { status: 404 });
    return NextResponse.json({ message: "Removed from favorites" });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
