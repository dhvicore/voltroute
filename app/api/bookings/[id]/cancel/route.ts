export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { formatSlot, notifyStation } from "@/lib/notify";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const db = getDb();

    const booking = db.prepare("SELECT * FROM bookings WHERE id = ? AND user_id = ?").get(params.id, auth.userId) as any;
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "confirmed") {
      return NextResponse.json({ error: `Cannot cancel a booking with status '${booking.status}'` }, { status: 400 });
    }

    db.prepare(
      `UPDATE bookings SET status = 'cancelled',
         payment_status = CASE WHEN payment_status = 'paid' THEN 'refunded' ELSE payment_status END,
         updated_at = datetime('now') WHERE id = ?`,
    ).run(params.id);
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(auth.userId) as { name: string };
    notifyStation(booking.station_id, "cancelled", "Booking cancelled", `${user.name} cancelled ${formatSlot(booking.booking_date, booking.start_time)}. The slot is free again.`);
    return NextResponse.json({ message: "Booking cancelled", booking_id: params.id });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
