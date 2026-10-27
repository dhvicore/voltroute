export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

// GET /api/operator/stations?q= — search stations an operator can sign up to manage
export async function GET(req: NextRequest) {
  ensureInit();
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const stations = getDb()
    .prepare(
      `SELECT id, name, address, city FROM stations
       WHERE is_enabled = 1 AND (? = '' OR name LIKE ? OR address LIKE ? OR city LIKE ? OR operator LIKE ?)
       ORDER BY name LIMIT 25`,
    )
    .all(q, like, like, like, like);
  return NextResponse.json({ stations });
}
