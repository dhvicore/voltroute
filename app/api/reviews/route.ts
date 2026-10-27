export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  ensureInit();
  const stationId = new URL(req.url).searchParams.get("station_id");
  if (!stationId) return NextResponse.json({ error: "Choose a station" }, { status: 400 });
  const db = getDb();
  if (!db.prepare("SELECT id FROM stations WHERE id = ?").get(stationId))
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  const reviews = db.prepare(`SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, u.name AS user_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.station_id = ? ORDER BY r.created_at DESC, r.rowid DESC LIMIT 20`).all(stationId);
  const summary = db.prepare("SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS rating FROM reviews WHERE station_id = ?").get(stationId);
  return NextResponse.json({ reviews, summary });
}

// Feedback stays on the station. Deliberately creates no provider notifications.
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: "Provide valid feedback" }, { status: 400 });
    const { station_id, rating, comment } = body;
    if (typeof station_id !== "string" || !station_id.trim())
      return NextResponse.json({ error: "Choose a station" }, { status: 400 });
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
      return NextResponse.json({ error: "Choose a whole-star rating from 1 to 5" }, { status: 400 });
    if (comment != null && (typeof comment !== "string" || comment.trim().length > 1500))
      return NextResponse.json({ error: "Feedback must be text of up to 1,500 characters" }, { status: 400 });
    const text = typeof comment === "string" ? comment.trim() : "";
    const db = getDb();
    if (!db.prepare("SELECT id FROM stations WHERE id = ?").get(station_id))
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    const result = db.transaction(() => {
      const previous = db.prepare("SELECT id FROM reviews WHERE user_id = ? AND station_id = ? ORDER BY created_at DESC LIMIT 1").get(auth.userId, station_id) as { id: string } | undefined;
      const id = previous?.id || uuid();
      if (previous) db.prepare("UPDATE reviews SET rating = ?, comment = ?, created_at = datetime('now') WHERE id = ?").run(rating, text || null, id);
      else db.prepare("INSERT INTO reviews (id, user_id, station_id, rating, comment) VALUES (?, ?, ?, ?, ?)").run(id, auth.userId, station_id, rating, text || null);
      const summary = db.prepare("SELECT ROUND(AVG(rating), 1) AS rating, COUNT(*) AS count FROM reviews WHERE station_id = ?").get(station_id) as { rating: number; count: number };
      db.prepare("UPDATE stations SET rating = ?, rating_count = ?, updated_at = datetime('now') WHERE id = ?").run(summary.rating, summary.count, station_id);
      return { review: { id, station_id, rating, comment: text }, summary, updated: !!previous };
    })();
    return NextResponse.json(result, { status: result.updated ? 200 : 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Could not save feedback. Please try again." }, { status: 500 });
  }
}
