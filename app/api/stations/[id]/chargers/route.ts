export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ensureInit } from "@/lib/init";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const db = getDb();
    const chargers = db.prepare("SELECT * FROM chargers WHERE station_id = ?").all(params.id);
    return NextResponse.json({ chargers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
