export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();

    let rewards = db.prepare("SELECT * FROM rewards WHERE user_id = ?").get(auth.userId) as any;
    if (!rewards) {
      db.prepare("INSERT INTO rewards (user_id, points, tier, total_earned) VALUES (?, 0, 'Bronze', 0)").run(auth.userId);
      rewards = { points: 0, tier: "Bronze", total_earned: 0 };
    }

    const badges = db.prepare("SELECT * FROM badges WHERE user_id = ? ORDER BY earned DESC, earned_at DESC").all(auth.userId);

    const tiers = [
      { name: "Bronze", min: 0, next: "Silver", target: 1000 },
      { name: "Silver", min: 1000, next: "Gold", target: 2500 },
      { name: "Gold", min: 2500, next: "Platinum", target: 5000 },
      { name: "Platinum", min: 5000, next: null, target: null },
    ];
    const currentTier = tiers.find(t => t.name === rewards.tier) || tiers[0];

    return NextResponse.json({
      rewards: {
        points: rewards.points,
        tier: rewards.tier,
        total_earned: rewards.total_earned,
        next_tier: currentTier.next,
        next_tier_target: currentTier.target,
        progress: currentTier.target ? Math.round((rewards.points / currentTier.target) * 100) : 100,
      },
      badges,
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
