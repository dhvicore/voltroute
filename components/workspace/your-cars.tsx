"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CarFront, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "./session-provider";
import { CarFields, carPayload, emptyCar } from "./car-fields";

export interface SavedCar {
  id: string;
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_range_km: number | null;
  max_charging_power_kw: number | null;
  connector_types: string[];
}

// The driver's own cars; the route planner only offers these.
export function YourCars() {
  const [cars, setCars] = useState<SavedCar[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyCar);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCars((await apiRequest<{ vehicles: SavedCar[] }>("/api/vehicles")).vehicles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your cars.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!draft.preset) {
      setError("Choose the car you drive.");
      return;
    }
    setBusy("add");
    setError(null);
    try {
      await apiRequest("/api/vehicles", { method: "POST", body: JSON.stringify(carPayload(draft)) });
      setDraft(emptyCar);
      setAdding(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this car.");
    } finally {
      setBusy(null);
    }
  }
  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await apiRequest(`/api/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove this car.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="account-card your-cars" id="cars">
      <div className="your-cars-head">
        <h2>Your cars</h2>
        {!adding && (
          <button className="operator-link" onClick={() => setAdding(true)}>
            <Plus size={14} />
            Add a car
          </button>
        )}
      </div>
      <p className="account-note">The route planner uses these cars’ real range and battery size.</p>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {cars === null ? (
        <p className="account-note">Loading your cars…</p>
      ) : (
        <ul className="your-cars-list">
          {cars.map((car) => (
            <li key={car.id}>
              <CarFront size={18} />
              <div>
                <strong>
                  {car.make} {car.model}
                </strong>
                <small>
                  {car.battery_capacity_kwh} kWh · {car.current_range_km ?? "—"} km range ·{" "}
                  {car.connector_types.map((c) => (c === "Type2" ? "Type 2" : c)).join(", ")}
                </small>
              </div>
              <button
                aria-label={`Remove ${car.make} ${car.model}`}
                disabled={busy === car.id || cars.length === 1}
                title={cars.length === 1 ? "Keep at least one car" : "Remove"}
                onClick={() => remove(car.id)}
              >
                {busy === car.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </li>
          ))}
          {cars.length === 0 && <li className="your-cars-empty">Add the car you drive to plan routes.</li>}
        </ul>
      )}
      {adding && (
        <form onSubmit={add} className="auth-form your-cars-form">
          <CarFields value={draft} onChange={setDraft} />
          <div className="your-cars-actions">
            <button type="button" className="operator-link" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="site-button" disabled={busy === "add"}>
              {busy === "add" ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
              Save car
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
