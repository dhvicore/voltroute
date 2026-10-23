export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";

// GET /api/favorites — list user's favorite stations
export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();
    const favorites = db.prepare(`
      SELECT s.*, f.created_at as favorited_at,
        (SELECT COUNT(*) FROM chargers c WHERE c.station_id = s.id AND c.status = 'available') as available_chargers
      FROM favorites f
      JOIN stations s ON s.id = f.station_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(auth.userId);

    const result = favorites.map((s: any) => ({
      ...s,
      amenities: JSON.parse(s.amenities || "[]"),
    }));

    return NextResponse.json({ favorites: result });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/favorites — add a favorite
export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { station_id } = await req.json();
    if (!station_id) return NextResponse.json({ error: "station_id is required" }, { status: 400 });

    const db = getDb();
    const station = db.prepare("SELECT id FROM stations WHERE id = ?").get(station_id);
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    try {
      db.prepare("INSERT INTO favorites (user_id, station_id) VALUES (?, ?)").run(auth.userId, station_id);
    } catch {
      return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
    }

    return NextResponse.json({ message: "Added to favorites" }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
