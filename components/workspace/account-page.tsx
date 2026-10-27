"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Brand } from "@/components/site/brand";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { NotificationBell } from "./notification-bell";
import { apiRequest, useSession, type DriverUser } from "./session-provider";
import { YourCars } from "./your-cars";
import { YourBookings } from "./your-bookings";
interface AccountData {
  user: DriverUser & { created_at?: string };
  stats: {
    total_bookings: number;
    total_sessions: number;
    total_vehicles: number;
    total_energy_kwh: number;
    total_spent: number;
  };
}
export function AccountPage() {
  const session = useSession(),
    router = useRouter();
  const [data, setData] = useState<AccountData | null>(null),
    [name, setName] = useState(""),
    [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (session.loading) return;
    if (!session.user || session.isDemo) {
      router.replace("/login?next=/profile");
      return;
    }
    let active = true;
    apiRequest<AccountData>("/api/profile")
      .then((d) => {
        if (active) {
          setData(d);
          setName(d.user.name);
          setPhone(d.user.phone || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session.loading, session.user?.id, session.isDemo, router]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const d = await apiRequest<{ user: DriverUser }>("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      session.updateUser(d.user);
      setData((current) =>
        current ? { ...current, user: { ...current.user, ...d.user } } : null,
      );
      setMessage("Your details have been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your details.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      await session.signOut();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log out.");
      setBusy(false);
    }
  }
  if (session.loading || !session.user || session.isDemo)
    return (
      <div className="account-loading">
        <Brand />
        <LoaderCircle className="animate-spin" size={24} />
        <p>Loading your account…</p>
      </div>
    );
  return (
    <div className="site-page account-page">
      <header className="site-header">
        <Brand />
        <nav className="account-nav">
          <NotificationBell />
          <ThemeToggle compact/>
          <Link href="/">Home</Link>
          {session.user.is_operator && (
            <Link href="/operator">Station console</Link>
          )}
          {!session.user.is_operator && (
            <Link href="/planner">Route planner</Link>
          )}
          <button onClick={logout} disabled={busy}>
            <LogOut size={15} />
            Log out
          </button>
        </nav>
      </header>
      <main className="account-main">
        <span className="site-eyebrow">Your personal space</span>
        <h1>Welcome, {session.user.name.split(" ")[0]}.</h1>
        <p className="account-intro">
          Your account details and your next journey, in one place.
        </p>
        <div className="account-grid">
          <section className="account-card">
            <div className="account-card-heading">
              <span className="account-avatar">
                {session.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <h2>My account</h2>
                <p>
                  <ShieldCheck size={12} />
                  Account active
                </p>
              </div>
            </div>
            <form onSubmit={save} className="auth-form">
              <label>
                Full name
                <span className="auth-input-wrap">
                  <UserRound size={16} />
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </span>
              </label>
              <label>
                Email address
                <span className="auth-input-wrap">
                  <Mail size={16} />
                  <input
                    name="email"
                    type="email"
                    readOnly
                    value={session.user.email}
                  />
                </span>
                <small>This email identifies your account.</small>
              </label>
              <label>
                Phone number
                <span className="auth-input-wrap">
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    maxLength={20}
                    placeholder="Add a contact number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </span>
              </label>
              {error && (
                <p role="alert" className="auth-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="account-success">
                  <Check size={15} />
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || !data}
                className="site-button auth-submit"
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                Save changes
              </button>
            </form>
          </section>
          <aside className="account-side">
            {session.user.is_operator ? (
            <section className="account-journey">
              <span className="site-eyebrow">Your station</span>
              <h2>
                See who’s
                <br />
                booked a slot.
              </h2>
              <p>
                Every booking drivers make at your station appears in your
                station console.
              </p>
              <Link href="/operator" className="site-button">
                Open station console
                <ArrowRight size={16} />
              </Link>
            </section>
            ) : (
            <section className="account-journey">
              <span className="site-eyebrow">The road is yours</span>
              <h2>
                Ready for your
                <br />
                next journey?
              </h2>
              <p>
                Open your existing route planner to explore charging stops and
                the booking preview.
              </p>
              <Link href="/planner" className="site-button">
                Open route planner
                <ArrowRight size={16} />
              </Link>
            </section>
            )}
            {!session.user.is_operator && <YourBookings />}
            {!session.user.is_operator && <YourCars />}
            <section className="account-card">
              <h2>Your saved activity</h2>
              <dl className="account-stats">
                <div>
                  <dt>Database bookings</dt>
                  <dd>{data?.stats.total_bookings ?? "—"}</dd>
                </div>
                <div>
                  <dt>Vehicles</dt>
                  <dd>{data?.stats.total_vehicles ?? "—"}</dd>
                </div>
                <div>
                  <dt>Charging sessions</dt>
                  <dd>{data?.stats.total_sessions ?? "—"}</dd>
                </div>
              </dl>
              <p className="account-note">
                Bookings you make in the planner while logged in are saved to
                your account.
              </p>
            </section>
          </aside>
        </div>
      </main>
      <footer className="site-footer">
        <Brand />
        <span>Your details are saved to your account.</span>
        <Link href="/planner">Plan a journey ↗</Link>
      </footer>
    </div>
  );
}
