"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CarFront, LoaderCircle } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { apiRequest, useSession } from "./session-provider";
import { CarFields, carPayload, emptyCar } from "./car-fields";

// Step after sign-up: the driver adds the car they drive (more can be added later).
export function AddCarPage() {
  const session = useSession();
  const router = useRouter();
  const [car, setCar] = useState(emptyCar);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const next = () => {
    const n = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/planner";
  };

  useEffect(() => {
    if (session.loading) return;
    if (!session.user || session.isDemo) {
      router.replace("/login?next=/add-car");
      return;
    }
    if (session.user.is_operator && session.user.role !== "admin") {
      router.replace("/operator");
      return;
    }
    apiRequest<{ vehicles: unknown[] }>("/api/vehicles")
      .then((d) => setCount(d.vehicles.length))
      .catch(() => setCount(0));
  }, [session.loading, session.user, session.isDemo, router]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!car.preset) {
      setError("Pick your car from the list, or choose “Other” to enter it yourself.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/vehicles", { method: "POST", body: JSON.stringify(carPayload(car)) });
      router.replace(next());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your car.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-page account-page">
      <header className="site-header">
        <Brand />
      </header>
      <main className="account-main add-car-main">
        <span className="site-eyebrow">One last step</span>
        <h1>Which car do you drive?</h1>
        <p className="account-intro">
          VoltRoute plans your range, charging stops and arrival battery from your car. You can add more cars later
          from My account and switch between them when you plan a route.
        </p>
        <form onSubmit={save} className="auth-form account-card add-car-card">
          <span className="add-car-icon">
            <CarFront size={22} />
          </span>
          <CarFields value={car} onChange={setCar} />
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <button type="submit" className="site-button auth-submit" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : null}
            Save my car
            <ArrowRight size={16} />
          </button>
          {!!count && (
            <button type="button" className="operator-link add-car-skip" onClick={() => router.replace(next())}>
              I’ve already added my cars — continue
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
