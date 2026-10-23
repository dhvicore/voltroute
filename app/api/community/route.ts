export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { v4 as uuid } from "uuid";

export async function GET(req: NextRequest) {
  ensureInit();
  try {
    const db = getDb();
    const reports = db.prepare(`
      SELECT cr.*, s.name as station_name, s.city as station_city, u.name as reporter_name
      FROM community_reports cr
      JOIN stations s ON s.id = cr.station_id
      JOIN users u ON u.id = cr.user_id
      ORDER BY cr.created_at DESC
    `).all();
    return NextResponse.json({ reports });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const { station_id, category, title, description } = await req.json();
    if (!station_id || !category || !title) {
      return NextResponse.json({ error: "station_id, category, and title are required" }, { status: 400 });
    }

    const db = getDb();
    const station = db.prepare("SELECT id FROM stations WHERE id = ?").get(station_id);
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    const id = uuid();
    db.prepare("INSERT INTO community_reports (id, user_id, station_id, category, title, description) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, auth.userId, station_id, category, title, description || null);

    const report = db.prepare(`
      SELECT cr.*, s.name as station_name, s.city as station_city
      FROM community_reports cr JOIN stations s ON s.id = cr.station_id
      WHERE cr.id = ?
    `).get(id);

    return NextResponse.json({ report }, { status: 201 });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
