export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ensureInit } from "@/lib/init";
import { managedStationIds } from "@/lib/planner-stations";
import { formatSlot, notify } from "@/lib/notify";

// POST /api/operator/bookings/:id — { action: "accept" | "decline" }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  ensureInit();
  try {
    const auth = requireAuth(req);
    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== "accept" && action !== "decline" && action !== "cash_received")
      return NextResponse.json({ error: "Action must be accept, decline or cash_received" }, { status: 400 });

    const db = getDb();
    const booking = db
      .prepare(
        `SELECT b.id, b.user_id, b.station_id, b.status, b.operator_status, b.payment_status, b.payment_method, b.deposit_amount, b.booking_date, b.start_time, s.name as station_name
         FROM bookings b JOIN stations s ON s.id = b.station_id WHERE b.id = ?`,
      )
      .get(params.id) as
      | { id: string; user_id: string; station_id: string; status: string; operator_status: string; payment_status: string; payment_method: string | null; deposit_amount: number; booking_date: string; start_time: string; station_name: string }
      | undefined;
    const managed = managedStationIds(auth.userId, auth.role);
    if (!booking || (managed !== "all" && !managed.includes(booking.station_id)))
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "confirmed")
      return NextResponse.json({ error: "This booking was already cancelled or completed" }, { status: 409 });

    // The station records cash paid on arrival for a pay-at-station booking.
    if (action === "cash_received") {
      if (booking.operator_status !== "accepted" || booking.payment_method !== "cash" || booking.payment_status !== "unpaid")
        return NextResponse.json({ error: "Only accepted pay-at-station bookings can be marked as paid in cash" }, { status: 409 });
      db.prepare(
        "UPDATE bookings SET payment_status = 'paid', payment_ref = 'CASH', updated_at = datetime('now') WHERE id = ? AND payment_status = 'unpaid'",
      ).run(booking.id);
      notify(
        booking.user_id,
        "payment",
        "Cash payment received",
        `${booking.station_name} received ₹${Math.round(booking.deposit_amount)} in cash for ${formatSlot(booking.booking_date, booking.start_time)}.`,
        "/profile#bookings",
      );
      return NextResponse.json({ ok: true });
    }

    if (booking.operator_status !== "pending")
      return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });

    db.prepare(
      `UPDATE bookings SET operator_status = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(action === "accept" ? "accepted" : "declined", action === "accept" ? "confirmed" : "cancelled", booking.id);
    const slot = formatSlot(booking.booking_date, booking.start_time);
    if (action === "accept") {
      notify(booking.user_id, "accepted", "Booking accepted", `${booking.station_name} accepted your slot on ${slot}. You can pay whenever you are ready from My bookings, or choose cash at the station. No payment is required now.`, "/profile#bookings");
    } else {
      // Demo refund of any payment already made.
      if (booking.payment_status === "paid")
        db.prepare("UPDATE bookings SET payment_status = 'refunded' WHERE id = ?").run(booking.id);
      notify(
        booking.user_id,
        "declined",
        "Booking declined",
        `${booking.station_name} couldn't take your slot on ${slot}.${booking.payment_status === "paid" ? " Your payment was refunded (demo)." : ""} Try another time.`,
        "/planner",
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
