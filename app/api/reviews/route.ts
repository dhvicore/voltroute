export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

// POST /api/reviews — add a review for a station
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { station_id, rating, comment } = await req.json();

    if (!station_id || !rating) {
      return NextResponse.json({ error: "station_id and rating are required" }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const db = getDb();
    const station = db.prepare("SELECT id FROM stations WHERE id = ?").get(station_id);
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    const id = uuid();
    db.prepare("INSERT INTO reviews (id, user_id, station_id, rating, comment) VALUES (?, ?, ?, ?, ?)")
      .run(id, auth.userId, station_id, rating, comment || null);

    // Update station aggregate rating
    const agg = db.prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE station_id = ?").get(station_id) as any;
    db.prepare("UPDATE stations SET rating = ROUND(?, 1), rating_count = ?, updated_at = datetime('now') WHERE id = ?")
      .run(agg.avg_rating, agg.cnt, station_id);

    return NextResponse.json({ review: { id, station_id, rating, comment } }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
