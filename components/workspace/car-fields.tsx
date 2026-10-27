"use client";
import { CarFront } from "lucide-react";
import { evModels } from "@/components/planner/ev-models";

export interface CarDraft {
  preset: string;
  make: string;
  model: string;
  battery_capacity_kwh: string;
  current_range_km: string;
  max_charging_power_kw: string;
  connector: "CCS2" | "Type2" | "CHAdeMO";
}

export const emptyCar: CarDraft = {
  preset: "",
  make: "",
  model: "",
  battery_capacity_kwh: "",
  current_range_km: "",
  max_charging_power_kw: "",
  connector: "CCS2",
};

export function carPayload(car: CarDraft) {
  return {
    make: car.make.trim(),
    model: car.model.trim(),
    battery_capacity_kwh: Number(car.battery_capacity_kwh),
    current_range_km: Number(car.current_range_km),
    max_charging_power_kw: Number(car.max_charging_power_kw || 0),
    connector_types: [car.connector],
  };
}

// Picking a known model fills in its specs; any field can still be edited.
function fromPreset(id: string): CarDraft {
  const m = evModels.find((e) => e.id === id);
  if (!m) return { ...emptyCar, preset: "other" };
  const [make, ...rest] = m.name.split(" · ")[0].split(" ");
  return {
    preset: id,
    make,
    model: rest.join(" "),
    battery_capacity_kwh: String(m.batteryKwh),
    current_range_km: String(m.rangeKm),
    max_charging_power_kw: String(m.maxDcKw),
    connector: m.connector === "Type 2" ? "Type2" : m.connector,
  };
}

export function CarFields({ value, onChange, compact = false }: { value: CarDraft; onChange: (car: CarDraft) => void; compact?: boolean }) {
  const set = (patch: Partial<CarDraft>) => onChange({ ...value, ...patch });
  const custom = value.preset !== "" && (!compact || value.preset === "other");
  return (
    <div className="car-fields">
      <label>
        Your car
        <span className="auth-input-wrap">
          <CarFront size={17} />
          <select
            required
            value={value.preset}
            onChange={(e) => onChange(e.target.value === "" ? emptyCar : fromPreset(e.target.value))}
          >
            <option value="">Choose your car</option>
            {evModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="other">Other — I’ll enter it myself</option>
          </select>
        </span>
      </label>
      {custom && (
        <div className="car-fields-grid">
          <label>
            Make
            <span className="auth-input-wrap">
              <input required maxLength={40} value={value.make} placeholder="e.g. Tata" onChange={(e) => set({ make: e.target.value })} />
            </span>
          </label>
          <label>
            Model
            <span className="auth-input-wrap">
              <input required maxLength={60} value={value.model} placeholder="e.g. Nexon EV" onChange={(e) => set({ model: e.target.value })} />
            </span>
          </label>
          <label>
            Battery (kWh)
            <span className="auth-input-wrap">
              <input required type="number" min={5} max={200} step="0.1" value={value.battery_capacity_kwh} onChange={(e) => set({ battery_capacity_kwh: e.target.value })} />
            </span>
          </label>
          <label>
            Range on full charge (km)
            <span className="auth-input-wrap">
              <input required type="number" min={50} max={1000} value={value.current_range_km} onChange={(e) => set({ current_range_km: e.target.value })} />
            </span>
          </label>
          <label>
            Connector
            <span className="auth-input-wrap">
              <select value={value.connector} onChange={(e) => set({ connector: e.target.value as CarDraft["connector"] })}>
                <option value="CCS2">CCS2</option>
                <option value="Type2">Type 2 (AC only)</option>
                <option value="CHAdeMO">CHAdeMO</option>
              </select>
            </span>
          </label>
          <label>
            Max fast charging (kW)
            <span className="auth-input-wrap">
              <input type="number" min={0} max={400} value={value.max_charging_power_kw} placeholder="0 if AC only" onChange={(e) => set({ max_charging_power_kw: e.target.value })} />
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
