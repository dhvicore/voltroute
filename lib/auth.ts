import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";

function signingSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const db = getDb();
  db.exec(
    "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key,value) VALUES ('session_secret',?)",
  ).run(randomBytes(48).toString("hex"));
  return (
    db
      .prepare("SELECT value FROM app_settings WHERE key='session_secret'")
      .get() as { value: string }
  ).value;
}
export const sessionCookie = "vr_session";
export function attachSession(response: NextResponse, token: string) {
  response.cookies.set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
  return response;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, signingSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, signingSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): TokenPayload | null {
  // A stale saved token must never override a valid login cookie.
  const authHeader = req.headers.get("authorization");
  const fromHeader = authHeader?.startsWith("Bearer ") ? verifyToken(authHeader.slice(7)) : null;
  if (fromHeader) return fromHeader;
  const cookie = req.cookies.get(sessionCookie)?.value;
  return cookie ? verifyToken(cookie) : null;
}

export function requireAuth(req: NextRequest): TokenPayload {
  const user = getTokenFromRequest(req);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function requireAdmin(req: NextRequest): TokenPayload {
  const user = requireAuth(req);
  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
