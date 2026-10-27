"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CreditCard, LoaderCircle, X } from "lucide-react";
import { StationFeedback } from "@/components/planner/station-feedback";
import { PaymentPanel } from "@/components/planner/payment-panel";
import { apiRequest } from "./session-provider";

interface DriverBooking {
  id: string;
  station_name: string;
  station_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  operator_status: "pending" | "accepted" | "declined";
  estimated_cost: number | null;
  deposit_amount: number;
  payment_status: "unpaid" | "paid" | "refunded";
  payment_ref: string | null;
  payment_method: string | null;
}

function statusLabel(b: DriverBooking) {
  if (b.operator_status === "declined") return ["Declined by station", "declined"];
  if (b.status === "cancelled") return ["Cancelled", "declined"];
  if (b.status === "completed") return ["Completed", "accepted"];
  return b.operator_status === "accepted" ? ["Accepted", "accepted"] : ["Waiting for station", "pending"];
}

// The driver's bookings, with a demo payment. No real money moves.
export function YourBookings() {
  const [bookings, setBookings] = useState<DriverBooking[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBookings((await apiRequest<{ bookings: DriverBooking[] }>("/api/bookings")).bookings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your bookings.");
    }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(id: string, path: string, method: string) {
    setBusy(id + path);
    setError(null);
    try {
      await apiRequest(`/api/bookings/${encodeURIComponent(id)}/${path}`, { method });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="account-card your-bookings" id="bookings">
      <h2>My bookings</h2>
      <p className="account-note">
        Request your slot without paying. Once accepted, pay whenever you are ready or choose cash at the station. Online payments are a demo.
      </p>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {bookings === null ? (
        <p className="account-note">Loading your bookings…</p>
      ) : bookings.length === 0 ? (
        <p className="account-note">No bookings yet. Plan a route and request a charging slot.</p>
      ) : (
        <ul className="your-bookings-list">
          {bookings.map((b) => {
            const [label, tone] = statusLabel(b);
            const active = b.status === "confirmed";
            return (
              <li key={b.id}>
                <div className="your-bookings-top">
                  <strong>{b.station_name}</strong>
                  <span className={`booking-pill ${tone}`}>{label}</span>
                </div>
                <small>
                  <CalendarDays size={12} />{" "}
                  {new Date(`${b.booking_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{" "}
                  · {b.start_time}–{b.end_time}
                  {b.estimated_cost != null && ` · est. ₹${Math.round(b.estimated_cost)}`}
                </small>
                <div className="your-bookings-pay">
                  <span>
                    <CreditCard size={13} />
                    {b.payment_status === "paid"
                      ? `₹${b.deposit_amount} paid (demo) · ${b.payment_ref}`
                      : b.payment_status === "refunded"
                        ? `₹${b.deposit_amount} refunded (demo)`
                        : b.status === "cancelled" ? "No payment due"
                        : b.operator_status !== "accepted" ? "No payment needed while waiting for acceptance"
                        : b.payment_method === "cash" ? "Cash at station · not yet paid" : `₹${b.deposit_amount} · pay later or at station`}
                  </span>
                  <div>
                    {active && b.operator_status === "accepted" && b.payment_status === "unpaid" && (
                      <button className="operator-accept" disabled={!!busy} onClick={() => setPaymentId(paymentId === b.id ? null : b.id)}>
                        {busy === b.id + "pay" ? <LoaderCircle size={13} className="animate-spin" /> : <CreditCard size={13} />}
                        {paymentId === b.id ? "Pay later · close" : "Payment options"}
                      </button>
                    )}
                    {active && (
                      <button className="operator-decline" disabled={!!busy} onClick={() => act(b.id, "cancel", "PATCH")}>
                        <X size={13} />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {paymentId === b.id && active && b.operator_status === "accepted" && b.payment_status === "unpaid" && <PaymentPanel
                  amount={Math.round(b.deposit_amount || b.estimated_cost || 0)}
                  onPay={async (method) => {
                    const result = await apiRequest<{ payment_ref: string }>(`/api/bookings/${encodeURIComponent(b.id)}/pay`, { method: "POST", body: JSON.stringify({ method }) });
                    await load();
                    setPaymentId(null);
                    return result;
                  }}
                />}
                {(b.operator_status === "accepted" || b.status === "completed") && <StationFeedback stationId={b.station_id} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
