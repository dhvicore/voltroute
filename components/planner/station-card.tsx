"use client";
import {
  Bookmark,
  ChevronRight,
  Star,
  Zap,
} from "lucide-react";
import { availabilityLabel, availabilityStyle, money } from "./demo-data";
import type { Connector, Station } from "./types";
import { DepthCard } from "./depth-card";

export function StationCard({
  station,
  connector,
  saved,
  onSave,
  onSelect,
}: {
  station: Station;
  connector: Connector;
  saved: boolean;
  onSave: () => void;
  onSelect: () => void;
}) {
  const charger =
    station.chargers.find((c) => c.connector === connector) ||
    station.chargers[0];
  return (
    <DepthCard as="article" className="vr-station-card group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-emerald-300/30 hover:bg-white/[.04]">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-semibold ${availabilityStyle[station.availability]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {availabilityLabel[station.availability]} · {station.available}/
          {station.total}
        </span>
        <button
          aria-label={`${saved ? "Unsave" : "Save"} ${station.name}`}
          aria-pressed={saved}
          onClick={onSave}
          className={`rounded-md p-1 transition hover:bg-white/10 ${saved ? "text-emerald-300" : "text-slate-500"}`}
        >
          <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight">
            {station.name}
          </h3>
          <ChevronRight
            size={15}
            className="mt-0.5 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300"
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          {station.distanceAlongRoute} km into your route ·{" "}
          {station.detourMinutes} min detour
        </p>
        <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-emerald-300" />
            {charger.power} kW
          </span>
          <span className="text-slate-600">|</span>
          <span>
            {money(charger.price)}
            <span className="text-slate-500">/kWh</span>
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Star size={10} fill="currentColor" className="text-amber-200" />
            {station.rating}
          </span>
        </div>
      </button>
    </DepthCard>
  );
}
