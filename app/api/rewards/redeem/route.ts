export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

const REDEEM_OPTIONS: Record<string, { points: number; label: string }> = {
  free_fast_charge: { points: 1200, label: "Free Fast-Charge Session" },
  volt_plus_month: { points: 2000, label: "1 Month Volt Plus" },
};

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { option } = await req.json();
    const redemption = REDEEM_OPTIONS[option];
    if (!redemption) return NextResponse.json({ error: "Invalid redemption option" }, { status: 400 });

    const db = getDb();
    const rewards = db.prepare("SELECT * FROM rewards WHERE user_id = ?").get(auth.userId) as any;
    if (!rewards || rewards.points < redemption.points) {
      return NextResponse.json({ error: `Not enough points. Need ${redemption.points}, have ${rewards?.points || 0}` }, { status: 400 });
    }

    db.prepare("UPDATE rewards SET points = points - ?, updated_at = datetime('now') WHERE user_id = ?")
      .run(redemption.points, auth.userId);

    const updated = db.prepare("SELECT * FROM rewards WHERE user_id = ?").get(auth.userId) as any;
    return NextResponse.json({ message: `Redeemed ${redemption.label}`, points_remaining: updated.points });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
