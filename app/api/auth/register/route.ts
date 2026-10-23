export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import bcryptjs from "bcryptjs";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  ensureInit();
  try {
    const { name, email, phone, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const id = uuid();
    const password_hash = bcryptjs.hashSync(password, 10);
    db.prepare("INSERT INTO users (id, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, email, phone || null, password_hash);

    const token = signToken({ userId: id, email, role: "user" });
    return NextResponse.json({ token, user: { id, name, email, role: "user" } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
