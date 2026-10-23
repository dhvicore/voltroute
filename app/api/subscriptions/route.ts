export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

const PLANS: Record<string, { name: string; price: number; features: string[] }> = {
  basic: { name: "Volt Basic", price: 0, features: ["Standard booking", "Base rewards rate", "Community support"] },
  plus: { name: "Volt Plus", price: 299, features: ["Lower session fees", "Priority booking", "1.5× rewards"] },
  max: { name: "Volt Max", price: 699, features: ["Priority charging slots", "2× rewards", "Premium support"] },
};

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1").get(auth.userId) as any;
    return NextResponse.json({
      subscription: sub || { plan: "basic", price: 0, is_active: 1 },
      plans: Object.entries(PLANS).map(([key, p]) => ({ id: key, ...p, is_current: sub ? sub.plan === key : key === "basic" })),
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { plan } = await req.json();
    if (!PLANS[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const db = getDb();
    db.prepare("UPDATE subscriptions SET is_active = 0 WHERE user_id = ? AND is_active = 1").run(auth.userId);

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);

    const id = uuid();
    db.prepare("INSERT INTO subscriptions (id, user_id, plan, price, started_at, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)")
      .run(id, auth.userId, plan, PLANS[plan].price, now.toISOString(), expires.toISOString());


    return NextResponse.json({ message: `Switched to ${PLANS[plan].name}`, plan });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
