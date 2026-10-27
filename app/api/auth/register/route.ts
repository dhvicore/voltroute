import { NextRequest } from "next/server";
import { accountRequest } from "@/lib/account";
export const dynamic = "force-dynamic";
export function POST(req: NextRequest) {
  return accountRequest(req, true);
}
