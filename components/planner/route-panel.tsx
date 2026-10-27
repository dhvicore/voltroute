"use client";

import {
  ArrowDownUp,
  ArrowRight,
  BatteryMedium,
  CarFront,
  ChevronDown,
  Leaf,
  LoaderCircle,
  MapPin,
  PlugZap,
  Route,
  Search,
  Zap,
} from "lucide-react";
import type { FormEvent } from "react";
import type { Connector, RouteInput } from "./types";
import { ChargingSculpture } from "./charging-sculpture";
import { defaultEvModel, type EvModel } from "./ev-models";

interface Props {
  input: RouteInput;
  onChange: (input: RouteInput) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  onToggle: () => void;
  mode: "route" | "stations";
  onModeChange: (mode: "route" | "stations") => void;
  /** The driver's saved cars; undefined for guests. */
  cars?: EvModel[];
}

export function RoutePanel({
  input,
  onChange,
  onSubmit,
  loading,
  error,
  expanded,
  onToggle,
  mode,
  onModeChange,
  cars,
}: Props) {
  const update = (patch: Partial<RouteInput>) =>
    onChange({ ...input, ...patch });
  const car = cars?.find((c) => c.id === input.vehicle) || cars?.[0] || defaultEvModel;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <section className="vr-panel vr-route-panel overflow-hidden" aria-label="Journey planner">
      <div className="flex border-b border-white/[.07] px-5 pt-2">
        {(
          [
            { id: "route", label: "Plan a route", icon: Route },
            { id: "stations", label: "Find a charger", icon: PlugZap },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            aria-pressed={mode === tab.id}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-xs font-semibold transition-colors ${mode === tab.id ? "border-emerald-300 text-emerald-300" : "border-transparent text-slate-400 hover:text-white"}`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-5 lg:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-[23px] font-semibold tracking-tight">
              {mode === "route" ? "Plan your route" : "Find a charger"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {mode === "route"
                ? "Charging stops, planned around you."
                : "Compatible stations along your route."}
            </p>
          </div>
          <span className="vr-panel-sculpture"><ChargingSculpture /></span>
          <button
            aria-label={
              expanded ? "Collapse route inputs" : "Expand route inputs"
            }
            aria-expanded={expanded}
            aria-controls="route-inputs"
            onClick={onToggle}
            className="vr-icon-button lg:hidden"
          >
            <ChevronDown size={18} className={expanded ? "rotate-180" : ""} />
          </button>
        </div>
        <form
          onSubmit={submit}
          id="route-inputs"
          className={`${expanded ? "block" : "hidden"} lg:block`}
        >
          <div className="relative rounded-2xl border border-white/10 bg-black/10">
            <div className="absolute left-[23px] top-[42px] h-8 border-l border-dashed border-slate-500" />
            <label className="flex items-center gap-3 px-4 py-3.5">
              <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-emerald-300" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-[.13em] text-slate-400">
                  Starting point
                </span>
                <input
                  aria-label="Source"
                  required
                  maxLength={160}
                  list="journey-locations"
                  value={input.source}
                  onChange={(e) => update({ source: e.target.value })}
                  className="mt-1 w-full bg-transparent text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Enter a city or address"
                />
              </span>
            </label>
            <div className="ml-12 mr-12 border-t border-white/[.07]" />
            <label className="flex items-center gap-3 px-4 py-3.5">
              <MapPin size={16} className="-ml-0.5 shrink-0 text-emerald-300" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-[.13em] text-slate-400">
                  Destination
                </span>
                <input
                  aria-label="Destination"
                  required
                  maxLength={160}
                  list="journey-locations"
                  value={input.destination}
                  onChange={(e) => update({ destination: e.target.value })}
                  className="mt-1 w-full bg-transparent text-[13px] text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Where are you heading?"
                />
              </span>
            </label>
            <button
              type="button"
              className="vr-icon-button absolute right-3 top-1/2 -translate-y-1/2 !h-8 !w-8 !rounded-lg !bg-[#25322e]"
              aria-label="Swap source and destination"
              onClick={() =>
                update({ source: input.destination, destination: input.source })
              }
            >
              <ArrowDownUp size={14} />
            </button>
            <datalist id="journey-locations">
              <option value="Mumbai, Maharashtra" />
              <option value="Pune, Maharashtra" />
              <option value="Indore, Madhya Pradesh" />
              <option value="Delhi" />
              <option value="Bengaluru, Karnataka" />
              <option value="Hyderabad, Telangana" />
              <option value="Chennai, Tamil Nadu" />
              <option value="Ahmedabad, Gujarat" />
              <option value="Jaipur, Rajasthan" />
              <option value="Nagpur, Maharashtra" />
              <option value="Bhopal, Madhya Pradesh" />
              <option value="Kolkata, West Bengal" />
              <option value="Goa" />
            </datalist>
          </div>
          <label className="vr-ev-picker mt-6 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
              <CarFront size={15} className="text-slate-400" />
              Your EV
            </span>
            {cars && cars.length > 0 ? (
              <span className="relative block">
                <select
                  id="ev-model"
                  value={car.id}
                  onChange={(e) => {
                    const next = cars.find((c) => c.id === e.target.value) || cars[0];
                    let battery = input.battery;
                    try {
                      const v = Number(localStorage.getItem(`voltroute-battery-${next.id}`));
                      if (v >= 5 && v <= 100) battery = v;
                    } catch {}
                    update({ vehicle: next.id, connector: next.connector, battery });
                  }}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 pr-9 text-[13px] text-slate-100 outline-none transition hover:border-white/25 focus:border-emerald-300/50"
                >
                  {cars.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </span>
            ) : (
              <a
                id="ev-model"
                href={cars ? "/profile#cars" : "/login?next=/planner"}
                className="flex items-center justify-between rounded-xl border border-dashed border-emerald-300/30 px-3 py-2.5 text-[12px] text-emerald-200 transition hover:border-emerald-300/60"
              >
                {cars ? "Add your car in My account" : "Log in to plan with your own car"}
                <ArrowRight size={14} />
              </a>
            )}
            <span className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>

              {car.rangeKm} km real-world range · {car.batteryKwh} kWh
              {car.maxDcKw ? ` · up to ${car.maxDcKw} kW DC` : " · AC charging only"}
              {!cars?.length && " (typical EV)"}
              </span>
              {!!cars?.length && (
                <a href="/profile#cars" className="shrink-0 text-emerald-300 hover:underline">
                  + Add a car
                </a>
              )}
            </span>
          </label>
          <div className="mb-2 mt-6 flex items-center justify-between">
            <label
              htmlFor="battery-level"
              className="flex items-center gap-2 text-xs font-medium text-slate-300"
            >
              <BatteryMedium size={16} className="text-slate-400" />
              Your battery now
            </label>
            <output
              htmlFor="battery-level"
              className="rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-semibold tabular-nums text-emerald-300"
            >
              {input.battery}%
            </output>
          </div>
          <input
            id="battery-level"
            type="range"
            min="5"
            max="100"
            step="1"
            value={input.battery}
            onChange={(e) => update({ battery: Number(e.target.value) })}
            style={{
              background: `linear-gradient(to right, #8be4b8 ${((input.battery - 5) / 95) * 100}%, #33413b 0%)`,
            }}
            className="vr-range my-2 w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>5%</span>
            <span>Range now · {Math.round((input.battery / 100) * car.rangeKm)} km</span>
            <span>100%</span>
          </div>
          <fieldset className="mt-6">
            <legend className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-300">
              <PlugZap size={15} className="text-slate-400" />
              Connector type
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {(["CCS2", "Type 2", "CHAdeMO"] as Connector[]).map(
                (connector) => (
                  <button
                    type="button"
                    key={connector}
                    aria-pressed={input.connector === connector}
                    onClick={() => update({ connector })}
                    className={`rounded-xl border px-1 py-2.5 text-[11px] font-medium transition ${input.connector === connector ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"}`}
                  >
                    {connector}
                  </button>
                ),
              )}
            </div>
          </fieldset>
          {mode === "route" && (
            <fieldset className="vr-route-preference mt-6">
              <legend className="mb-3 text-xs font-medium text-slate-300">
                Route preference
              </legend>
              <div className="grid grid-cols-2 items-stretch gap-2">
                {(
                  [
                    {
                      value: "charging",
                      title: "Charging-friendly",
                      description:
                        "Prioritize charging availability",
                      icon: Leaf,
                    },
                    {
                      value: "fastest",
                      title: "Fastest route",
                      description: "Prioritize travel time",
                      icon: Zap,
                    },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${input.preference === option.value ? "border-emerald-300/25 bg-emerald-300/[.045]" : "border-white/[.07] hover:bg-white/[.03]"}`}
                  >
                    <option.icon
                      size={17}
                      className={
                        input.preference === option.value
                          ? "text-emerald-300"
                          : "text-slate-400"
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                        {option.description}
                      </span>
                    </span>
                    <input
                      className="h-3.5 w-3.5 accent-emerald-300"
                      type="radio"
                      name="route-preference"
                      value={option.value}
                      checked={input.preference === option.value}
                      onChange={() => update({ preference: option.value })}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-200"
            >
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="vr-primary mt-5 w-full"
            type="submit"
          >
            {loading ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : mode === "route" ? (
              <Route size={16} />
            ) : (
              <Search size={16} />
            )}
            {loading
              ? "Finding route & chargers…"
              : mode === "route"
                ? "Find my route"
                : "Find compatible chargers"}
            <ArrowRight size={16} className="ml-auto" />
          </button>
        </form>
      </div>
    </section>
  );
}
