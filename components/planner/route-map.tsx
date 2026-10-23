"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  Check,
  Layers3,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Zap,
} from "lucide-react";
import type { MapViewProps } from "./types";
import { availabilityLabel } from "./demo-data";

const roads = [
  "M0 160 Q230 170 350 60 T750 30 L1200 170",
  "M30 440 Q200 400 360 310 T760 240 T1200 360",
  "M120 0 Q190 120 185 275 T160 560 L220 850",
  "M280 0 Q300 180 366 300 T430 650 L600 850",
  "M600 0 Q570 200 660 300 T735 400 T810 850",
  "M950 0 Q860 220 942 465 T1000 850",
  "M0 700 Q250 640 450 710 T850 720 T1200 790",
  "M250 500 Q390 500 488 445 T760 470 T1200 540",
  "M0 90 L280 110 L430 230 L700 190 L850 250 L1200 100",
  "M900 0 Q1030 140 1010 330 T1130 695 L1200 760",
  "M50 600 Q250 590 330 350 L420 220 L500 0",
  "M350 850 Q400 690 598 565 T790 510 L1100 560",
  "M185 275 L270 200 L360 230 L410 140",
  "M735 400 L800 320 L940 345 L1050 240",
  "M942 465 L1020 430 L1140 460 L1200 420",
  "M1130 695 L1060 720 L980 690 L850 790",
  "M488 445 L460 360 L530 300 L610 350",
  "M598 565 L560 670 L650 700 L700 850",
  "M40 340 L170 350 L220 420 L310 470",
  "M330 350 L300 460 L350 570 L440 590",
  "M735 400 L700 510 L770 620 L890 650",
  "M366 300 L430 290 L500 220 L570 240",
  "M1130 695 L1170 600 L1130 500 L1200 350",
  "M185 275 L110 230 L80 130",
  "M488 445 L540 490 L598 565",
  "M940 160 L800 130 L700 180 L600 100",
  "M260 680 L350 660 L390 750 L530 780",
  "M980 80 L1060 120 L1140 70",
  "M760 60 L730 130 L790 220",
  "M850 790 L760 760 L700 680",
];
const statusColors = {
  available: "#8be4b8",
  filling: "#efc679",
  full: "#ee9697",
};

export function RouteMap({
  stations,
  route,
  selectedStationId,
  onSelectStation,
  savedIds,
}: MapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [terrain, setTerrain] = useState(true);
  const [perspective, setPerspective] = useState(true);
  const reducedMotion = useReducedMotion();
  const reverse = route?.source.toLowerCase().includes("pune");
  return (
    <div
      className="vr-map relative h-full min-h-[470px] overflow-hidden"
      data-perspective={perspective && !reducedMotion}
      aria-label="Illustrative route map with selectable charging stations"
    >
      <div
        className="vr-map-scene absolute inset-0"
        style={{ "--map-zoom": zoom } as React.CSSProperties}
      >
        <svg
          viewBox="0 0 1200 850"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="map-grid"
              width="48"
              height="48"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M48 0H0V48"
                fill="none"
                stroke="#89b5a5"
                strokeOpacity=".025"
              />
            </pattern>
            <pattern
              id="terrain-dots"
              width="19"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="5" cy="6" r="1.4" fill="#83ac7b" fillOpacity=".08" />
              <circle cx="14" cy="16" r="1" fill="#83ac7b" fillOpacity=".06" />
            </pattern>
            <linearGradient id="sea" x2="1" y2="1">
              <stop stopColor="#101f24" />
              <stop offset="1" stopColor="#142528" />
            </linearGradient>
            <radialGradient id="forest">
              <stop stopColor="#294333" stopOpacity=".55" />
              <stop offset="1" stopColor="#24392d" stopOpacity=".05" />
            </radialGradient>
            <filter id="route-glow">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <rect width="1200" height="850" fill="#19231f" />
          <rect width="1200" height="850" fill="url(#map-grid)" />
          <path
            d="M0 0H98Q70 70 126 132T110 245Q150 300 113 365T75 500Q130 600 125 650T168 850H0Z"
            fill="url(#sea)"
          />
          <path
            d="M98 0Q70 70 126 132T110 245Q150 300 113 365T75 500Q130 600 125 650T168 850"
            fill="none"
            stroke="#36534e"
            strokeWidth="1.5"
          />
          <path
            d="M150 0Q170 120 140 200T215 320Q240 380 215 470"
            stroke="#203d3b"
            strokeWidth="12"
            fill="none"
          />
          {terrain && (
            <g>
              <path
                d="M490 0Q600 80 565 190T630 320Q670 430 620 520T710 850H900Q840 650 890 530T850 300Q790 150 870 0Z"
                fill="url(#forest)"
              />
              <path
                d="M490 0Q600 80 565 190T630 320Q670 430 620 520T710 850H900Q840 650 890 530T850 300Q790 150 870 0Z"
                fill="url(#terrain-dots)"
              />
              <path
                d="M280 30Q300 80 260 130T350 180L430 120L420 25Z"
                fill="#24352a"
              />
              <path
                d="M770 70Q810 110 800 150T900 200L930 90Z"
                fill="#24352a"
              />
              <path
                d="M350 650Q450 580 510 680T610 780L440 830Z"
                fill="#22352a"
              />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M${550 + i * 15} 30 Q${650 + i * 18} 200 ${610 + i * 16} 330 T${690 + i * 19} 610 T${730 + i * 20} 850`}
                  stroke="#52705a"
                  strokeOpacity=".07"
                  fill="none"
                />
              ))}
            </g>
          )}
          <path
            d="M1120 100Q1080 260 990 300T900 350Q850 430 780 475T900 600"
            stroke="#2b4542"
            strokeWidth="5"
            fill="none"
          />
          <g fill="none" strokeLinecap="round">
            {roads.map((d, i) => (
              <path
                key={d}
                d={d}
                stroke={i < 8 ? "#34413a" : "#2b3730"}
                strokeWidth={i < 8 ? 3 : 1.5}
              />
            ))}
          </g>
          <path
            d="M185 275C300 350 390 540 598 565S800 565 942 545S1050 605 1130 695"
            stroke="#68746b"
            strokeWidth="3"
            fill="none"
            strokeDasharray="7 7"
            opacity=".45"
          />
          {route?.mapPath && (
            <g fill="none" strokeLinecap="round">
              <path
                d={route.mapPath}
                stroke="#8be4b8"
                strokeWidth="16"
                opacity=".15"
                filter="url(#route-glow)"
              />
              <path d={route.mapPath} stroke="#315d47" strokeWidth="9" />
              <motion.path key={route.id} d={route.mapPath} stroke="#9ae7bf" strokeWidth="3.5"
                initial={reducedMotion ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.35, ease: "easeInOut" }} />
              <path className="vr-route-flow" pathLength={1000}
                d={route.mapPath}
                stroke="#dbfce9"
                strokeWidth="3"
                strokeDasharray="4 196"
                opacity=".65"
              />
            </g>
          )}
        </svg>
        <div
          className="vr-map-label left-[6%] top-[70%] !text-[10px] !tracking-[.28em] !text-[#56777a]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          ARABIAN SEA
        </div>
        <div className="vr-map-label left-[17%] top-[23%]">NAVI MUMBAI</div>
        <div className="vr-map-label left-[38%] top-[33%] !text-[10px]">
          PANVEL
        </div>
        <div className="vr-map-label left-[64%] top-[56%] !text-[10px]">
          LONAVALA
        </div>
        <div className="vr-map-label left-[77%] top-[38%] !text-[10px]">
          TALEGAON
        </div>
        <div className="absolute left-[15.4%] top-[32.3%] -translate-x-1/2 -translate-y-1/2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-[5px] ${reverse ? "border-[#293b32] bg-slate-100" : "border-[#244a39] bg-emerald-200 shadow-[0_0_0_9px_#8be4b812]"}`}
          />
          <span className="absolute -left-6 top-9 text-sm font-semibold text-slate-200">
            Mumbai
          </span>
        </div>
        <div className="absolute left-[94%] top-[81.7%] -translate-x-1/2 -translate-y-1/2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border-4 text-[#21332a] ${reverse ? "border-[#244a39] bg-emerald-200 shadow-[0_0_0_9px_#8be4b812]" : "border-[#293b32] bg-slate-100"}`}
          >
            <MapPin size={12} fill="currentColor" />
          </span>
          <span className="absolute -left-1 top-9 text-sm font-semibold text-slate-200">
            Pune
          </span>
        </div>
        <span className="absolute left-[34%] top-[46%] rounded border border-white/10 bg-[#26322c] px-1.5 py-0.5 text-[8px] font-semibold text-slate-400">
          NH 48
        </span>
        <span className="absolute left-[72%] top-[68%] rounded border border-white/10 bg-[#26322c] px-1.5 py-0.5 text-[8px] font-semibold text-slate-400">
          NH 48
        </span>
        {stations.map((station) => {
          const recommended = route?.stops.some(
            (stop) => stop.stationId === station.id,
          );
          return (
            <button
              key={station.id}
              onClick={() => onSelectStation(station)}
              style={
                {
                  left: `${station.mapPosition.x / 12}%`,
                  top: `${station.mapPosition.y / 8.5}%`,
                  "--marker-color": statusColors[station.availability],
                } as React.CSSProperties
              }
              className={`vr-station-marker ${recommended ? "is-recommended" : ""} ${selectedStationId === station.id ? "is-selected" : ""}`}
              aria-label={`${station.name}, ${availabilityLabel[station.availability]}, ${station.available} of ${station.total} chargers available`}
            >
              {recommended && (
                <span className="vr-marker-label">
                  <span className="flex items-center gap-1.5 text-[9px] text-emerald-300">
                    <Check size={10} />
                    RECOMMENDED STOP
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-100">
                    {station.name.split(" · ")[1]}
                    <span className="ml-2 text-emerald-300">
                      {station.available} available
                    </span>
                  </span>
                </span>
              )}
              <span className="vr-marker-pin">
                <Zap size={17} fill="currentColor" />
                {savedIds.includes(station.id) && (
                  <Bookmark
                    size={8}
                    className="absolute -right-1 -top-1"
                    fill="currentColor"
                  />
                )}
              </span>
              <span className="vr-marker-count">
                {station.available}/{station.total}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute left-6 top-6 right-20">
        <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[.22em] text-emerald-200/70">
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          Journey preview
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-[#e6eee8] sm:text-[28px]">
          {route ? `${route.source.split(",")[0]} to ${route.destination.split(",")[0]}` : "Explore your route"}
        </h2>
        <p className="mt-2 text-[11px] text-[#8b9c91]">
          {route
            ? `${route.distance} km · ${route.stations.length} compatible charging stations`
            : "Choose your destination to find charging stops."}
        </p>
      </div>
      <div className="absolute right-5 top-6 flex flex-col items-center gap-3">
        <span className="text-[9px] font-semibold text-slate-400">N</span>
        <Navigation
          size={24}
          strokeWidth={1.25}
          className="-rotate-45 text-[#adc4b4]"
        />
      </div>
      <div className="absolute right-5 top-28 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#18231f]/95 shadow-xl">
        <button
          className="vr-map-control"
          disabled={zoom >= 1.6}
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))}
          aria-label="Zoom in"
        >
          <Plus size={17} />
        </button>
        <span className="mx-2 border-t border-white/10" />
        <button
          className="vr-map-control"
          disabled={zoom <= 0.8}
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
          aria-label="Zoom out"
        >
          <Minus size={17} />
        </button>
        <span className="mx-2 border-t border-white/10" />
        <button
          className="vr-map-control"
          onClick={() => setZoom(1)}
          aria-label="Reset map view"
        >
          <LocateFixed size={16} />
        </button>
      </div>
      <button
        className="vr-icon-button absolute right-5 top-[265px] !bg-[#18231f]/95 shadow-xl"
        aria-label="Show terrain"
        aria-pressed={terrain}
        onClick={() => setTerrain((t) => !t)}
      >
        <Layers3 size={17} className={terrain ? "text-emerald-300" : ""} />
      </button>
      <button className="vr-icon-button vr-perspective-toggle absolute right-5 top-[315px] !bg-[#18231f]/95" aria-label="Toggle 3D map view" aria-pressed={perspective && !reducedMotion} disabled={!!reducedMotion} onClick={() => setPerspective(value => !value)}>
        <span className="text-[11px] font-semibold">3D</span>
      </button>
      <div className="absolute bottom-4 right-5 flex flex-col items-end gap-3 lg:bottom-14">
        <div className="flex gap-3 rounded-xl border border-white/[.08] bg-[#18231f]/90 px-3 py-2.5 backdrop-blur-xl">
          {Object.entries(statusColors).map(([key, color]) => (
            <span
              key={key}
              className="flex items-center gap-1.5 text-[9px] text-slate-300"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: color }}
              />
              {availabilityLabel[key as keyof typeof availabilityLabel]}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[8px] text-slate-500">
          <span className="border-b border-x border-slate-500 px-3 pb-0.5">
            {Math.round(20 / zoom)} km
          </span>
          <span>Illustrative map · Not for navigation</span>
        </div>
      </div>
    </div>
  );
}
