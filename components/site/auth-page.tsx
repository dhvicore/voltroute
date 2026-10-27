"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Brand } from "./brand";
import { EVScene } from "./ev-scene";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { motion, MotionConfig } from "framer-motion";
import { authDestination } from "@/lib/auth-destination";
import { CarFields, carPayload, emptyCar } from "@/components/workspace/car-fields";
import { useSession } from "@/components/workspace/session-provider";

export function AuthPage({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<"driver" | "operator">(
    "driver",
  );
  const [car, setCar] = useState(emptyCar);
  const [stationId, setStationId] = useState("");
  const [stationQuery, setStationQuery] = useState("");
  const [stations, setStations] = useState<
    { id: string; name: string; address: string; city: string }[]
  >([]);
  useEffect(() => {
    if (!register || accountType !== "operator") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/operator/stations?q=${encodeURIComponent(stationQuery)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => setStations(d.stations || []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [register, accountType, stationQuery]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (register && accountType === "operator" && !stationId)
        throw new Error("Choose the charging station you manage.");
      if (register && accountType === "driver" && !car.preset)
        throw new Error("Choose the car you drive so we can plan your charging stops.");
      const user = register
        ? await session.register(
            name,
            email,
            password,
            accountType === "operator" ? stationId : undefined,
            accountType === "driver" ? carPayload(car) : undefined,
          )
        : await session.signIn(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(authDestination(user, next));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className="auth-page cinematic-auth">
        <section className="auth-story">
          <Brand light />
          <span className="auth-scene-index">01 — YOUR NEXT CHAPTER</span>
          <div className="auth-story-heading">
            <span className="site-eyebrow">Designed for electric living</span>
            <h1>
              A little charge.
              <br />
              <span>A world of possibility.</span>
            </h1>
            <p>
              Electric journeys. Beautifully simple.
              <br />
              Your next chapter starts here.
            </p>
          </div>
          <EVScene variant="auth" />
          <div className="auth-art-note">
            <span className="pulse-dot" /> BUILT FOR THE WAY YOU MOVE
          </div>
          <div className="auth-story-footer">
            <ShieldCheck size={15} />
            <span>Your vehicles. Your routes. Your space.</span>
            <span>VoltRoute</span>
          </div>
        </section>
        <main className="auth-main">
          <div className="auth-topline">
            <span aria-hidden="true" />
            <ThemeToggle compact />
          </div>
          <motion.div
            className="auth-form-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
          >
            <div className="auth-mobile-brand">
              <Brand />
            </div>
            <span className="site-eyebrow">
              {register ? "A new way forward" : "Good to see you again"}
            </span>
            <h2>{register ? "Your journey starts here." : "Welcome back."}</h2>
            <p className="auth-intro">
              {register
                ? "Create your account and make your next charge effortless."
                : "A little closer to your next adventure."}
            </p>
            <form onSubmit={submit} className="auth-form">
              {register && (
                <div
                  className="auth-account-type"
                  role="radiogroup"
                  aria-label="Account type"
                >
                  {(
                    [
                      ["driver", "EV driver"],
                      ["operator", "Station provider"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={accountType === value}
                      className={accountType === value ? "active" : ""}
                      onClick={() => setAccountType(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {register && accountType === "operator" && (
                <label>
                  Station you manage
                  <span className="auth-input-wrap">
                    <input
                      type="search"
                      value={stationQuery}
                      onChange={(e) => setStationQuery(e.target.value)}
                      placeholder="Search by station name or city"
                    />
                  </span>
                  <span className="auth-input-wrap">
                    <select
                      name="station"
                      required
                      value={stationId}
                      onChange={(e) => setStationId(e.target.value)}
                    >
                      <option value="">
                        {stations.length
                          ? "Choose your station"
                          : "No stations match"}
                      </option>
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.city && s.city !== "India" ? ` — ${s.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </span>
                  <small>
                    Don’t see it? Plan a route through your station first, so
                    it’s added from OpenStreetMap.
                  </small>
                </label>
              )}
              {register && (
                <label>
                  Your name
                  <span className="auth-input-wrap">
                    <UserRound size={17} />
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </span>
                </label>
              )}
              <label>
                Email address
                <span className="auth-input-wrap">
                  <Mail size={17} />
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </span>
              </label>
              <label>
                Password
                <span className="auth-input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    required
                    minLength={register ? 8 : 1}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      register ? "Create a password" : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
                {register && <small>Use at least 8 characters.</small>}
              </label>
              {register && accountType === "driver" && <CarFields value={car} onChange={setCar} compact />}
              {error && (
                <p role="alert" className="auth-error">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="site-button auth-submit"
                type="submit"
              >
                {busy ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : null}
                {busy
                  ? "Just a moment…"
                  : register
                    ? "Create your account"
                    : "Log in"}
                <ArrowRight size={17} />
              </button>
            </form>
            <p className="auth-switch">
              {register ? "Already part of the journey?" : "New to VoltRoute?"}
              <Link href={register ? "/login" : "/register"}>
                {register ? "Log in" : "Create an account"}
                <ArrowUpIcon />
              </Link>
            </p>
          </motion.div>
          <div className="auth-footer">
            <ShieldCheck size={13} /> Your account is protected with securely
            hashed passwords.
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
function ArrowUpIcon() {
  return <ArrowRight size={12} className="-rotate-45" />;
}
