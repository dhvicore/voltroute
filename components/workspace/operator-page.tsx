"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CalendarDays,
  Check,
  LoaderCircle,
  LogOut,
  RefreshCw,
  X,
} from "lucide-react";
import { Brand } from "@/components/site/brand";
import { NotificationBell } from "./notification-bell";
import { apiRequest, useSession } from "./session-provider";
import { ChargerEditor } from "./charger-editor";

interface OperatorBooking {
  id: string;
  station_id: string;
  station_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  operator_status: "pending" | "accepted" | "declined";
  deposit_amount: number;
  payment_method?: string;
  payment_status: "unpaid" | "paid" | "refunded";
  estimated_cost: number | null;
  created_at: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  connector_type: string;
  power_kw: number;
  vehicle_make: string | null;
  vehicle_model: string | null;
  is_new: number;
}
interface OperatorData {
  stations: { id: string; name: string; address: string }[];
  bookings: OperatorBooking[];
}

const refreshMs = 15000;

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function bookedAt(created: string) {
  return new Date(`${created.replace(" ", "T")}Z`).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OperatorPage() {
  const session = useSession();
  const router = useRouter();
  const [data, setData] = useState<OperatorData | null>(null);
  const [date, setDate] = useState("");
  const [stationId, setStationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (stationId) params.set("station_id", stationId);
      setData(await apiRequest<OperatorData>(`/api/operator/bookings?${params}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    } finally {
      setRefreshing(false);
    }
  }, [date, stationId]);

  useEffect(() => {
    if (session.loading) return;
    if (!session.user || session.isDemo) {
      router.replace("/login?next=/operator");
      return;
    }
    load();
    const timer = setInterval(load, refreshMs);
    return () => clearInterval(timer);
  }, [session.loading, session.user?.id, session.isDemo, router, load]);

  async function markSeen() {
    await apiRequest("/api/operator/seen", { method: "POST" }).catch(() => {});
    load();
  }
  async function respond(id: string, action: "accept" | "decline" | "cash_received") {
    setActing(id);
    try {
      await apiRequest(`/api/operator/bookings/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this booking.");
    } finally {
      setActing(null);
    }
  }
  async function logout() {
    await session.signOut();
    router.replace("/login");
  }

  if (session.loading || !session.user || session.isDemo)
    return (
      <div className="account-loading">
        <Brand />
        <LoaderCircle className="animate-spin" size={24} />
        <p>Loading your station…</p>
      </div>
    );

  const bookings = data?.bookings ?? [];
  const newCount = bookings.filter((b) => b.is_new).length;
  const pending = bookings.filter(
    (b) => b.status === "confirmed" && b.operator_status === "pending",
  ).length;
  const accepted = bookings.filter((b) => b.operator_status === "accepted").length;
  const title =
    data?.stations.length === 1 ? data.stations[0].name : "Your stations";

  return (
    <div className="site-page account-page">
      <header className="site-header">
        <Brand />
        <nav className="account-nav">
          <NotificationBell />
          <Link href="/">Home</Link>
          <Link href="/profile">Account</Link>
          <button onClick={logout}>
            <LogOut size={15} />
            Log out
          </button>
        </nav>
      </header>
      <main className="account-main">
        <span className="site-eyebrow">Station console</span>
        <h1>{title}</h1>
        <p className="account-intro">
          Drivers request charging slots at your station. Accept or decline
          each request; the driver sees your answer. This page refreshes
          automatically.
        </p>

        {error && (
          <p role="alert" className="auth-error">
            {error}
          </p>
        )}

        {pending > 0 && (
          <div className="operator-notice operator-notice-pending" role="status">
            <BellRing size={18} />
            <span>
              <strong>
                {pending} booking request{pending > 1 ? "s" : ""}
              </strong>{" "}
              waiting for your answer.
            </span>
          </div>
        )}
        {newCount > 0 && (
          <div className="operator-notice" role="status">
            <BellRing size={18} />
            <span>
              <strong>
                {newCount} new booking{newCount > 1 ? "s" : ""}
              </strong>{" "}
              since you last checked.
            </span>
            <button onClick={markSeen}>
              <Check size={14} />
              Mark as seen
            </button>
          </div>
        )}

        {(stationId || data?.stations[0]?.id) && (
          <ChargerEditor key={stationId || data!.stations[0].id} stationId={stationId || data!.stations[0].id} />
        )}

        <h2 className="operator-section-title">Booking requests</h2>
        <div className="operator-toolbar">
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {date && (
            <button className="operator-link" onClick={() => setDate("")}>
              Show all dates
            </button>
          )}
          {(data?.stations.length ?? 0) > 1 && (
            <label>
              Station
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
              >
                <option value="">All stations</option>
                {data!.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="operator-summary">
            {bookings.length} request{bookings.length === 1 ? "" : "s"} ·{" "}
            {pending} waiting · {accepted} accepted
          </span>
          <button
            className="operator-link"
            onClick={load}
            aria-label="Refresh bookings"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {!data ? (
          <p className="account-note">Loading bookings…</p>
        ) : bookings.length === 0 ? (
          <section className="account-card operator-empty">
            <CalendarDays size={22} />
            <h2>No booking requests {date ? `on ${formatDate(date)}` : "yet"}</h2>
            <p>When a driver requests a charging slot, it appears here for you to accept or decline.</p>
          </section>
        ) : (
          <div className="operator-table-wrap">
            <table className="operator-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Driver</th>
                  <th>Charger</th>
                  {(data.stations.length ?? 0) > 1 && <th>Station</th>}
                  <th>Est. cost</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Booked at</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={b.is_new ? "is-new" : ""}>
                    <td>
                      {formatDate(b.booking_date)}
                      {!!b.is_new && <span className="operator-badge">New</span>}
                    </td>
                    <td>
                      {b.start_time}–{b.end_time}
                      <small>{b.duration_minutes} min</small>
                    </td>
                    <td>
                      <strong>{b.user_name}</strong>
                      <small>{b.user_email}</small>
                      {b.user_phone && <small>{b.user_phone}</small>}
                      {b.vehicle_make && (
                        <small>
                          {b.vehicle_make} {b.vehicle_model}
                        </small>
                      )}
                    </td>
                    <td>
                      {b.connector_type} · {b.power_kw} kW
                    </td>
                    {data.stations.length > 1 && <td>{b.station_name}</td>}
                    <td>
                      {b.estimated_cost != null
                        ? `₹${b.estimated_cost.toFixed(2)}`
                        : "—"}
                    </td>
                    <td>
                      <span className={`operator-status ${b.payment_status === "paid" ? "confirmed" : "cancelled"}`}>
                        {b.payment_status === "paid"
                          ? `₹${b.deposit_amount} paid${b.payment_method === "cash" ? " in cash" : ""}`
                          : b.payment_status === "refunded"
                            ? "Refunded"
                            : b.payment_method === "cash" ? "Cash at station · unpaid" : "Unpaid"}
                      </span>
                      {b.payment_method === "cash" && b.payment_status === "unpaid" && b.operator_status === "accepted" && (
                        <button
                          className="operator-link operator-cash"
                          disabled={acting === b.id}
                          onClick={() => respond(b.id, "cash_received")}
                        >
                          Mark cash received
                        </button>
                      )}
                    </td>
                    <td>
                      {b.status === "confirmed" && b.operator_status === "pending" ? (
                        <div className="operator-actions">
                          <button
                            className="operator-accept"
                            disabled={acting === b.id}
                            onClick={() => respond(b.id, "accept")}
                          >
                            {acting === b.id ? (
                              <LoaderCircle size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            Accept
                          </button>
                          <button
                            className="operator-decline"
                            disabled={acting === b.id}
                            onClick={() => respond(b.id, "decline")}
                            aria-label={`Decline booking from ${b.user_name}`}
                          >
                            <X size={13} />
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`operator-status ${b.operator_status === "declined" ? "cancelled" : b.status}`}
                        >
                          {b.operator_status === "declined"
                            ? "Declined"
                            : b.status === "confirmed"
                              ? "Accepted"
                              : b.status.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td>{bookedAt(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Bookings are saved to the VoltRoute database.</span>
        <Link href="/profile">Your account ↗</Link>
      </footer>
    </div>
  );
}
