export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { sendDueReminders } from "@/lib/notify";

// GET /api/notifications — latest notifications and unread count
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    sendDueReminders();
    const db = getDb();
    const items = db
      .prepare("SELECT id, kind, title, body, link, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30")
      .all(auth.userId);
    const unread = (db.prepare("SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(auth.userId) as { n: number }).n;
    return NextResponse.json({ notifications: items, unread });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/notifications — mark all as read
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    getDb().prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(auth.userId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
