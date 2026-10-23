import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "voltroute-dev-secret-change-in-production";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  return null;
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
