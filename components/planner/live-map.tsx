"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { BatteryMedium, Clock3, LocateFixed, MapPin, Minus, Navigation, Plus, Zap, Route as RouteIcon } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { availabilityLabel, duration } from "./demo-data";
import type { MapViewProps, PlannedRoute } from "./types";
import { createGoogleEngine, createLeafletEngine, type HtmlMarker, type MapEngine } from "./map-engines";

// Battery and elapsed time when reaching `km` along the route, including earlier charging stops.
function progressAt(route: PlannedRoute, km: number) {
  const pctPerKm = 100 / (route.rangeKm || 320);
  const byId = new Map(route.stations.map((s) => [s.id, s.distanceAlongRoute]));
  let battery = route.startBattery ?? 0;
  let position = 0;
  let chargeMinutes = 0;
  for (const stop of route.stops) {
    const stopKm = byId.get(stop.stationId) ?? 0;
    if (stopKm >= km) break;
    battery = stop.targetBattery;
    position = stopKm;
    chargeMinutes += stop.minutes + (route.stations.find(s => s.id === stop.stationId)?.detourMinutes || 0);
  }
  return {
    battery: Math.max(0, Math.round(battery - (km - position) * pctPerKm)),
    minutes: Math.round((km / Math.max(route.distance, 1)) * route.driveMinutes) + chargeMinutes,
  };
}

const clusterPx = 64;
const statusColors = { available: "#8be4b8", filling: "#efc679", full: "#ee9697" };
const zapPath =
  "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z";
// With a Google Maps key the map is drawn by Google (required when showing Google data).
const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const fitPadding = { top: 210, left: 60, bottom: 70, right: 80 };

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const shortName = (name: string) => name.split(/ · | - /).pop() || name;

// Real road route and stations, styled like the VoltRoute journey preview.
export function LiveMap({
  stations,
  route,
  selectedStationId,
  onSelectStation,
  savedIds,
}: MapViewProps) {
  const { theme } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<MapEngine | null>(null);
  const select = useRef(onSelectStation);
  select.current = onSelectStation;
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = container.current;
    if (!el) return;
    const onZoom = () => drawStationsRef.current();
    (googleKey
      ? createGoogleEngine(el, googleKey, onZoom, theme).catch((e) => {
          console.error(e);
          return createLeafletEngine(el, onZoom);
        })
      : createLeafletEngine(el, onZoom)
    ).then((e) => {
      if (cancelled) return e.destroy();
      engine.current = e;
      drawRouteRef.current();
      drawStationsRef.current();
    });
    return () => {
      cancelled = true;
      engine.current?.destroy();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fit() {
    engine.current?.fit(route?.coordinates || null, fitPadding);
  }

  function drawRoute() {
    const e = engine.current;
    if (!e) return;
    const coords = route?.coordinates || null;
    e.setRoute(
      coords,
      coords && coords.length > 1
        ? [
            { point: coords[0], label: route!.source.split(",")[0], start: true },
            { point: coords[coords.length - 1], label: route!.destination.split(",")[0], start: false },
          ].map(({ point, label, start }) => ({
            point,
            html: `<span class="vr-live-end ${start ? "is-start" : "is-end"}"></span><span class="vr-live-end-label">${escape(label)}</span>`,
          }))
        : [],
    );
    if (route && fitted.current !== route.id) {
      fitted.current = route.id;
      fit();
    }
  }

  function drawStations() {
    const e = engine.current;
    if (!e) return;
    const stopIds = new Set(route?.stops.map((s) => s.stationId));
    // Group stations that would overlap at this zoom; stops and the selected one stay separate.
    const groups: { point: { x: number; y: number }; items: typeof stations }[] = [];
    for (const station of stations) {
      if (!station.location) continue;
      const point = e.project([station.location.lat, station.location.lng]);
      const single = stopIds.has(station.id) || station.id === selectedStationId;
      const group = single
        ? undefined
        : groups.find(
            (g) =>
              !g.items.some((s) => stopIds.has(s.id) || s.id === selectedStationId) &&
              Math.hypot(g.point.x - point.x, g.point.y - point.y) < clusterPx,
          );
      if (group) group.items.push(station);
      else groups.push({ point, items: [station] });
    }
    const markers: HtmlMarker[] = [];
    for (const group of groups) {
      if (group.items.length > 1) {
        const available = group.items.reduce((n, s) => n + s.available, 0);
        const total = group.items.reduce((n, s) => n + s.total, 0);
        const pts = group.items.map((s) => [s.location!.lat, s.location!.lng] as [number, number]);
        const center: [number, number] = [
          pts.reduce((n, p) => n + p[0], 0) / pts.length,
          pts.reduce((n, p) => n + p[1], 0) / pts.length,
        ];
        const color = available === 0 ? statusColors.full : statusColors.available;
        markers.push({
          point: center,
          className: "vr-live-marker",
          title: `${group.items.length} stations · ${available} of ${total} chargers free now`,
          html: `<span class="vr-station-marker vr-live-cluster" style="--marker-color:${color}"><span class="vr-live-cluster-count">${group.items.length}</span><span class="vr-marker-count">${available}/${total}</span></span>`,
          onClick: () => e.fit(pts, { top: 80, left: 80, bottom: 80, right: 80 }),
        });
        continue;
      }
      const station = group.items[0];
      const recommended = stopIds.has(station.id);
      const selected = station.id === selectedStationId;
      const label = recommended
        ? `<span class="vr-marker-label"><span class="vr-live-rec">✓ RECOMMENDED STOP</span><span class="vr-live-rec-name">${escape(shortName(station.name))}<span>${station.available} free now</span></span></span>`
        : "";
      const saved = savedIds.includes(station.id) ? `<span class="vr-live-saved"></span>` : "";
      markers.push({
        point: [station.location!.lat, station.location!.lng],
        className: "vr-live-marker",
        title: `${station.name} · ${availabilityLabel[station.availability]} · ${station.available} of ${station.total} chargers free now`,
        zIndex: selected ? 1500 : recommended ? 1000 : 0,
        html: `<span class="vr-station-marker ${recommended ? "is-recommended" : ""} ${selected ? "is-selected" : ""}" style="--marker-color:${statusColors[station.availability]}">${label}<span class="vr-marker-pin"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="${zapPath}"/></svg>${saved}</span><span class="vr-marker-count">${station.available}/${station.total}</span></span>`,
        onClick: () => select.current(station),
      });
    }
    e.setMarkers(markers);
  }

  const drawStationsRef = useRef(drawStations);
  drawStationsRef.current = drawStations;
  const drawRouteRef = useRef(drawRoute);
  drawRouteRef.current = drawRoute;
  useEffect(drawRoute, [route]);
  useEffect(drawStations, [stations, route, selectedStationId, savedIds]);
  useEffect(() => engine.current?.setTheme(theme), [theme]);

  const selected = stations.find((s) => s.id === selectedStationId);
  const toSelected = route && selected ? progressAt(route, selected.distanceAlongRoute) : null;
  const arrival = route ? route.arrivalBattery : null;

  return (
    <div className="vr-map vr-live-map relative h-full min-h-[470px] overflow-hidden" data-theme-map={theme}>
      <div ref={container} className="absolute inset-0" aria-label="Map of your route and charging stations" />
      <div className="vr-live-shade" aria-hidden="true" />
      <div className="pointer-events-none absolute left-6 right-20 top-6 z-[500]">
        <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[.22em] text-emerald-200/70 vr-live-eyebrow">
          <span className="h-1 w-1 rounded-full bg-emerald-300" />
          {route ? "Your journey" : "Plan anywhere in India"}
        </div>
        <h2 className="vr-live-title text-2xl font-medium tracking-tight sm:text-[28px]">
          {route
            ? `${route.source.split(",")[0]} to ${route.destination.split(",")[0]}`
            : "Explore your route"}
        </h2>
        <p className="vr-live-subtitle mt-2 text-[11px]">
          {route
            ? `${route.distance} km · ${route.stations.length} charging stations along the way`
            : "Enter any start and destination to find charging stops."}
        </p>
      </div>
      {route && (
        <div className="vr-live-stats" role="status" aria-live="polite">
          <span>
            <RouteIcon size={14} />
            <strong>{route.distance}</strong> km
          </span>
          <span>
            <Clock3 size={14} />
            <strong>{duration(route.driveMinutes)}</strong>
            <small title={route.trafficUpdatedAt ? `Traffic updated ${new Date(route.trafficUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Live traffic is unavailable; this is the routing provider's driving estimate."}>
              {route.liveTraffic ? "driving · live traffic" : "driving estimate · no live traffic"}
            </small>
          </span>
          {route.chargeMinutes > 0 && <span><Zap size={14} /><strong>{route.chargeMinutes} min</strong><small>charging estimate</small></span>}
          {route.startBattery != null && (
            <span>
              <BatteryMedium size={14} />
              <strong>{route.startBattery}%</strong> now
              <small>→ {arrival}% on arrival</small>
            </span>
          )}
          {selected && toSelected && (
            <span className="vr-live-stats-stop">
              <MapPin size={14} />
              To {selected.name.split(/ · | - /).pop()}: <strong>{selected.distanceAlongRoute} km</strong>
              <small>
                · {duration(toSelected.minutes)} · arrive with {toSelected.battery}%
              </small>
            </span>
          )}
        </div>
      )}
      <div className="absolute right-5 top-6 z-[500] flex flex-col items-center gap-3">
        <span className="text-[9px] font-semibold text-slate-400">N</span>
        <Navigation size={24} strokeWidth={1.25} className="-rotate-45 text-[#adc4b4]" />
      </div>
      <div className="vr-live-controls absolute right-5 top-28 z-[500] flex flex-col overflow-hidden rounded-xl border shadow-xl">
        <button className="vr-map-control" onClick={() => engine.current?.zoomIn()} aria-label="Zoom in">
          <Plus size={17} />
        </button>
        <span className="mx-2 border-t border-white/10" />
        <button className="vr-map-control" onClick={() => engine.current?.zoomOut()} aria-label="Zoom out">
          <Minus size={17} />
        </button>
        <span className="mx-2 border-t border-white/10" />
        <button className="vr-map-control" onClick={fit} aria-label="Show whole route">
          <LocateFixed size={16} />
        </button>
      </div>
      <div className="vr-live-legend absolute bottom-4 right-5 z-[500] flex gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-xl lg:bottom-14">
        <span className="text-[9px] font-semibold">Free now:</span>
        {Object.entries(statusColors).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1.5 text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {availabilityLabel[key as keyof typeof availabilityLabel]}
          </span>
        ))}
        <span className="vr-estimate-tag" title="Availability is estimated from VoltRoute bookings, not live charger status.">
          Est.
        </span>
      </div>
    </div>
  );
}
