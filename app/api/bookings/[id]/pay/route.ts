export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { formatSlot, notify, notifyStation } from "@/lib/notify";

const methods: Record<string, string> = { upi: "UPI", card: "Card", wallet: "Wallet", cash: "Cash at station" };

// POST /api/bookings/:id/pay { method } — demo payment of the booking amount. No real money moves.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const method = body?.method;
    if (typeof method !== "string" || !Object.hasOwn(methods, method))
      return NextResponse.json({ error: "Choose a supported payment method" }, { status: 400 });
    const db = getDb();
    const booking = db
      .prepare(
        `SELECT b.*, s.name as station_name, u.name as user_name FROM bookings b
         JOIN stations s ON s.id = b.station_id JOIN users u ON u.id = b.user_id
         WHERE b.id = ? AND b.user_id = ?`,
      )
      .get(params.id, auth.userId) as any;
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "confirmed")
      return NextResponse.json({ error: "This booking is no longer active" }, { status: 409 });
    if (booking.operator_status !== "accepted")
      return NextResponse.json({ error: "Payment is available only after the station accepts your booking" }, { status: 409 });
    if (booking.payment_status === "paid")
      return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
    if (method === "cash") {
      const result = db.prepare("UPDATE bookings SET payment_method = 'cash', updated_at = datetime('now') WHERE id = ? AND status = 'confirmed' AND operator_status = 'accepted' AND payment_status = 'unpaid'").run(booking.id);
      if (!result.changes) return NextResponse.json({ error: "Booking is no longer eligible for payment" }, { status: 409 });
      if (booking.payment_method !== "cash") {
        notify(auth.userId, "payment", "Pay at the station selected", `Pay cash at ${booking.station_name} when you arrive. No payment has been collected.`, "/profile#bookings");
        notifyStation(booking.station_id, "payment", "Cash at station selected", `${booking.user_name} will pay at the station for ${formatSlot(booking.booking_date, booking.start_time)}. Payment has not been collected.`);
      }
      return NextResponse.json({ payment_status: "unpaid", payment_ref: "AT-STATION", method });
    }
    const ref = `DEMO-${randomBytes(4).toString("hex").toUpperCase()}`;
    // Older bookings may have no amount stored; fall back to the estimate.
    const amount = Math.round(booking.deposit_amount || booking.estimated_cost || 0);
    const result = db.prepare(
      "UPDATE bookings SET payment_status = 'paid', payment_ref = ?, payment_method = ?, deposit_amount = ?, updated_at = datetime('now') WHERE id = ? AND status = 'confirmed' AND operator_status = 'accepted' AND payment_status = 'unpaid'",
    ).run(ref, method, amount, booking.id);
    if (!result.changes) return NextResponse.json({ error: "Booking is no longer eligible for payment" }, { status: 409 });
    const slot = formatSlot(booking.booking_date, booking.start_time);
    notify(auth.userId, "payment", "Payment successful (demo)", `₹${amount} by ${methods[method]} for ${booking.station_name} on ${slot}. Reference ${ref}.`, "/profile#bookings");
    notifyStation(booking.station_id, "payment", "Payment received", `${booking.user_name} paid ₹${amount} (demo) for ${slot}.`);
    return NextResponse.json({ payment_status: "paid", payment_ref: ref, amount, method });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
