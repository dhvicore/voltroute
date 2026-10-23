"use client";
import {
  BatteryMedium,
  ChevronDown,
  Clock3,
  Flag,
  Route,
  Zap,
} from "lucide-react";
import { duration, money } from "./demo-data";
import type { PlannedRoute, Station } from "./types";
import { AnimatePresence, motion } from "framer-motion";
import { DepthCard } from "./depth-card";

export function RouteSummary({
  route,
  expanded,
  onToggle,
  onSelectStation,
}: {
  route: PlannedRoute;
  expanded: boolean;
  onToggle: () => void;
  onSelectStation: (station: Station) => void;
}) {
  return (
    <DepthCard as="section" intensity={1.6}
      className="vr-panel vr-route-summary"
      aria-label="Route station density summary"
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        aria-expanded={expanded}
        aria-controls="route-summary-content"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
            <Route size={19} />
          </span>
          <span>
            <span className="block text-sm font-semibold">
              Route overview
            </span>
            <span className="mt-1 block text-[11px] text-slate-400">
              {expanded ? `${route.stations.length} compatible stations along the way` : `${route.distance} km · ${duration(route.driveMinutes + route.chargeMinutes)} · ${route.arrivalBattery}% arrival`}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] text-emerald-300 sm:block">
            {route.isDemo ? "Route preview" : "Route ready"}
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>{expanded && (
        <motion.div key="summary-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
        <div id="route-summary-content" className="px-5 pb-5">
          <div key={route.id} className="vr-route-metrics grid grid-cols-3 gap-3 border-y border-white/[.07] py-4">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Route size={12} />
                Distance
              </p>
              <p className="text-xl font-semibold tracking-tight">
                {route.distance}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  km
                </span>
              </p>
            </div>
            <div className="border-x border-white/[.07] px-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <Clock3 size={12} />
                Duration
              </p>
              <p className="whitespace-nowrap text-xl font-semibold tracking-tight">
                {duration(route.driveMinutes + route.chargeMinutes)}
              </p>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <BatteryMedium size={12} />
                Arrival charge
              </p>
              <p
                className={`text-xl font-semibold tracking-tight ${route.arrivalBattery < 20 ? "text-amber-300" : "text-emerald-300"}`}
              >
                {route.arrivalBattery}%
              </p>
            </div>
          </div>
          <div className="mb-4 mt-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Charging stops
            </p>
            <span className="text-[10px] text-slate-400">
              {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""} ·{" "}
              {route.chargeMinutes} min charging
            </span>
          </div>
          <div className="relative flex items-start justify-between gap-2">
            <div className="absolute left-3 right-3 top-3 h-px bg-gradient-to-r from-emerald-300/40 via-emerald-300 to-emerald-300/40" />
            <div className="relative max-w-[28%]">
              <span className="vr-timeline-node">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              <p className="mt-2 text-[11px] font-medium">
                {route.source.split(",")[0]}
              </p>
              <p className="mt-1 text-[9px] text-slate-500">Departure</p>
            </div>
            {route.stops.map((stop) => {
              const station = route.stations.find(
                (s) => s.id === stop.stationId,
              );
              if (!station) return null;
              return (
                <button
                  key={stop.stationId}
                  onClick={() => onSelectStation(station)}
                  className="relative max-w-[44%] text-center"
                >
                  <span className="vr-timeline-node mx-auto !border-emerald-300 !bg-emerald-300 !text-[#10271d]">
                    <Zap size={13} fill="currentColor" />
                  </span>
                  <p className="mt-2 text-[11px] font-medium text-emerald-200">
                    {station.name.split(" · ")[1] || station.name}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {stop.batteryOnArrival}% → {stop.targetBattery}% ·{" "}
                    {stop.minutes} min
                  </p>
                </button>
              );
            })}
            <div className="relative max-w-[28%] text-right">
              <span className="vr-timeline-node ml-auto">
                <Flag size={11} />
              </span>
              <p className="mt-2 text-[11px] font-medium">
                {route.destination.split(",")[0]}
              </p>
              <p className="mt-1 text-[9px] text-slate-500">
                {route.arrivalBattery}% on arrival
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[.07] pt-4 text-[11px]">
            <span className="text-slate-400">{route.stops.length ? "Estimated charging cost" : "No charging stop needed"}</span>
            <span className="font-medium text-emerald-200">{money(route.estimatedCost)}</span>
          </div>
        </div>
        </motion.div>
      )}</AnimatePresence>
    </DepthCard>
  );
}
