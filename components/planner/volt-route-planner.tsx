"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryMedium,
  Bookmark,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  HelpCircle,
  Leaf,
  Route,
  SlidersHorizontal,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-provider";
import { NotificationBell } from "@/components/workspace/notification-bell";
import { BookingDrawer } from "./booking-drawer";
import { Dialog } from "./dialog";
import { buildDemoRoute, defaultInput, demoStations, money } from "./demo-data";
import { defaultEvModel } from "./ev-models";
import { applyBookedStop } from "./replan";
import { RouteMap } from "./route-map";
import { RoutePanel } from "./route-panel";
import { RouteSummary } from "./route-summary";
import { StationCard } from "./station-card";
import type {
  Booking,
  PlannedRoute,
  PlannerAdapters,
  RouteInput,
  Station,
} from "./types";

const emptyAdapters: PlannerAdapters = {};
function savedBattery(carId: string) {
  try {
    const v = Number(localStorage.getItem(`voltroute-battery-${carId}`));
    return v >= 5 && v <= 100 ? v : null;
  } catch {
    return null;
  }
}
const storageKey = "voltroute-planner-v1";

export function VoltRoutePlanner({
  adapters = emptyAdapters,
}: {
  adapters?: PlannerAdapters;
}) {
  // The live planner starts empty so drivers choose their own trip.
  const startInput = adapters.calculateRoute
    ? { ...defaultInput, source: "", destination: "" }
    : defaultInput;
  const [input, setInput] = useState<RouteInput>(startInput);
  const [appliedInput, setAppliedInput] = useState<RouteInput>(startInput);
  const cars = adapters.cars;
  const car = cars?.find((c) => c.id === input.vehicle) || cars?.[0] || defaultEvModel;
  // Start with the car the driver used last on this device, if it's still theirs.
  useEffect(() => {
    if (!cars?.length) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("voltroute-ev");
    } catch {}
    const model = cars.find((c) => c.id === saved) || cars[0];
    setInput((i) => ({ ...i, vehicle: model.id, connector: model.connector, battery: savedBattery(model.id) ?? i.battery }));
  }, [cars]);
  // Each car keeps the battery level the driver last entered for it.
  useEffect(() => {
    if (!input.vehicle || !cars?.length) return;
    try {
      localStorage.setItem(`voltroute-battery-${input.vehicle}`, String(input.battery));
    } catch {}
  }, [input.vehicle, input.battery, cars]);
  useEffect(() => {
    try {
      if (input.vehicle) localStorage.setItem("voltroute-ev", input.vehicle);
    } catch {}
  }, [input.vehicle]);
  const [route, setRoute] = useState<PlannedRoute | null>(() =>
    adapters.calculateRoute ? null : buildDemoRoute(defaultInput),
  );
  const [selected, setSelected] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [mode, setMode] = useState<"route" | "stations">("route");
  const [activeView, setActiveView] = useState<"planner" | "saved">("planner");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<"bookings" | "help" | "vehicle" | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [bookedStops, setBookedStops] = useState<NonNullable<RouteInput["bookedStops"]>>([]);
  const [savedBookings, setSavedBookings] = useState<Booking[] | null>(null);
  useEffect(() => {
    if (dialog !== "bookings" || !adapters.listBookings) return;
    adapters.listBookings().then(setSavedBookings).catch(() => setSavedBookings(null));
  }, [dialog, adapters.listBookings]);
  const shownBookings = adapters.listBookings ? savedBookings ?? [] : bookings;
  const MapComponent = adapters.MapComponent || RouteMap;
  useEffect(() => {
    const compactDesktop = window.matchMedia("(min-width: 1024px) and (max-height: 820px)");
    const collapseOnShortScreen = () => { if (compactDesktop.matches) setSummaryExpanded(false); };
    collapseOnShortScreen();
    compactDesktop.addEventListener("change", collapseOnShortScreen);
    return () => compactDesktop.removeEventListener("change", collapseOnShortScreen);
  }, []);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (Array.isArray(stored?.savedIds))
        setSavedIds(
          stored.savedIds.filter((id: unknown) => typeof id === "string"),
        );
      if (Array.isArray(stored?.bookings))
        setBookings(
          stored.bookings.filter(
            (booking: Booking) =>
              booking &&
              typeof booking.id === "string" &&
              typeof booking.stationName === "string" &&
              typeof booking.chargerId === "string" &&
              typeof booking.date === "string" &&
              typeof booking.startTime === "string" &&
              typeof booking.durationMinutes === "number",
          ),
        );
    } catch {
      /* A fresh preview still works when local storage is unavailable. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ savedIds, bookings }));
    } catch {
      /* Session-only state is still usable. */
    }
  }, [ready, savedIds, bookings]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);
  const stations = useMemo(() => {
    const base =
      mode === "route" && route
        ? route.stations
        : adapters.stations || demoStations;
    return base
      .filter((s) => s.chargers.some((c) => c.connector === input.connector))
      .filter((s) => !availableOnly || s.available > 0)
      .filter((s) => activeView !== "saved" || savedIds.includes(s.id));
  }, [
    mode,
    route,
    adapters.stations,
    input.connector,
    availableOnly,
    activeView,
    savedIds,
  ]);
  const dirty = JSON.stringify(input) !== JSON.stringify(appliedInput);
  const onSave = (station: Station) => {
    const saved = savedIds.includes(station.id);
    setSavedIds((ids) =>
      saved ? ids.filter((id) => id !== station.id) : [...ids, station.id],
    );
    setToast(
      saved
        ? "Station removed from saved places."
        : "Station saved for another day.",
    );
  };
  const calculate = async () => {
    if (!input.source.trim() || !input.destination.trim()) {
      setError("Add a starting point and destination to plan your journey.");
      return;
    }
    if (
      input.source.trim().toLowerCase() ===
      input.destination.trim().toLowerCase()
    ) {
      setError("Choose a destination different from your starting point.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // A new search starts a fresh trip with no booked stops.
      setBookedStops([]);
      const nextRoute = adapters.calculateRoute
        ? await adapters.calculateRoute({
            ...input,
            car: {
              name: car.name,
              batteryKwh: car.batteryKwh,
              rangeKm: car.rangeKm,
              maxDcKw: car.maxDcKw,
              maxAcKw: car.maxAcKw,
            },
          })
        : buildDemoRoute(input);
      setRoute(nextRoute);
      if (nextRoute.warning) setError(nextRoute.warning);
      setAppliedInput({ ...input });
      setSummaryExpanded(true);
      setActiveView("planner");
      if (window.matchMedia("(max-width: 1023px)").matches) setExpanded(false);
      if (!nextRoute.warning) setToast(
        mode === "route"
          ? "Your journey is ready to explore."
          : "Compatible chargers are ready to explore.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t find a route. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className="vr-app">
        <a href="#route-inputs" className="vr-skip-link">
          Skip to route planner
        </a>
        <header className="vr-header">
          <a
            href="/"
            aria-label="VoltRoute home"
            className="flex shrink-0 items-center gap-2.5"
          >
            <img src="/logo.png" alt="" width={38} height={38} className="h-[38px] w-[38px] shrink-0" />
            <span className="text-[21px] font-semibold tracking-[-.8px]">
              Volt<span className="font-normal text-[#a2e5be]">Route</span>
            </span>
          </a>
          <nav
            aria-label="Main navigation"
            className="flex h-full items-center gap-1 sm:gap-3"
          >
            <button
              aria-label="Route planner"
              onClick={() => {
                setActiveView("planner");
                setMode("route");
              }}
              aria-current={
                activeView === "planner" && !dialog ? "page" : undefined
              }
              className={`vr-nav-item ${activeView === "planner" ? "active" : ""}`}
            >
              <Route size={15} />
              <span>Route planner</span>
            </button>
            <button
              aria-label="My bookings"
              onClick={() => setDialog("bookings")}
              className="vr-nav-item"
            >
              <CalendarDays size={15} />
              <span>My bookings</span>
              {bookings.length > 0 && (
                <span className="rounded bg-emerald-300/15 px-1 text-[9px] text-emerald-300">
                  {bookings.length}
                </span>
              )}
            </button>
            <button
              aria-label="Saved stations"
              onClick={() => {
                setActiveView((view) =>
                  view === "saved" ? "planner" : "saved",
                );
              }}
              aria-pressed={activeView === "saved"}
              className={`vr-nav-item ${activeView === "saved" ? "active" : ""}`}
            >
              <Bookmark size={15} />
              <span>Saved</span>
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggle compact/>
            {!!cars?.length && (
            <button
              onClick={() => setDialog("vehicle")}
              className="hidden items-center gap-2.5 rounded-xl border border-white/[.08] px-3 py-2 text-xs text-slate-300 xl:flex"
            >
              <CarFront size={17} className="text-slate-400" />
              {car.name.split(" · ")[0]}
              <span className="mx-1 h-3 border-l border-white/10" />
              <BatteryMedium size={15} className="text-emerald-300" />
              <span className="text-emerald-300">{input.battery}%</span>
              <ChevronDown size={12} />
            </button>
            )}
            <button
              className="vr-icon-button hidden sm:flex"
              aria-label="About this preview"
              onClick={() => setDialog("help")}
            >
              <HelpCircle size={17} />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300/15 bg-emerald-300/10 text-[11px] font-semibold text-emerald-200"
              onClick={() => setDialog("vehicle")}
              aria-label="View vehicle and account"
            >
              EV
            </button>
          </div>
        </header>
        <div className="vr-workspace">
          <aside className="vr-sidebar" aria-label="Route and station controls">
            <RoutePanel
              cars={cars}
              input={input}
              onChange={setInput}
              onSubmit={calculate}
              loading={loading}
              error={error}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              mode={mode}
              onModeChange={(next) => {
                setMode(next);
                setExpanded(true);
                setActiveView("planner");
              }}
            />
            <section className="mt-6" aria-labelledby="stations-heading">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2
                    id="stations-heading"
                    className="text-[13px] font-semibold"
                  >
                    {activeView === "saved"
                      ? "Your saved stations"
                      : "Along your way"}
                  </h2>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-white/[.06] px-1 text-[10px] text-slate-400">
                    {stations.length}
                  </span>
                </div>
                <button
                  onClick={() => setAvailableOnly((v) => !v)}
                  aria-pressed={availableOnly}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition ${availableOnly ? "border-emerald-300/30 text-emerald-300" : "border-white/10 text-slate-400 hover:text-white"}`}
                >
                  <SlidersHorizontal size={11} />
                  {availableOnly ? "Available" : "All stations"}
                </button>
              </div>
              {dirty && (
                <p className="mb-3 text-[10px] leading-relaxed text-amber-200/80">
                  Journey changed. Select “Find my route” to update your route
                  preview.
                </p>
              )}
              <div className="space-y-3">
                {stations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    connector={input.connector}
                    saved={savedIds.includes(station.id)}
                    onSave={() => onSave(station)}
                    onSelect={() => setSelected(station)}
                  />
                ))}
              </div>
              {stations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center">
                  <Bookmark size={24} className="mx-auto mb-3 text-slate-500" />
                  <p className="text-sm font-medium">
                    {activeView === "saved"
                      ? "Good places are worth saving."
                      : "No matching chargers here."}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {activeView === "saved"
                      ? "Tap the bookmark on a station to keep it close."
                      : "Try another connector or show all stations."}
                  </p>
                  <button
                    className="mt-4 text-xs text-emerald-300"
                    onClick={() => {
                      setActiveView("planner");
                      setAvailableOnly(false);
                      setInput((i) => ({ ...i, connector: "CCS2" }));
                    }}
                  >
                    Show all stations{" "}
                    <ArrowRight size={12} className="ml-1 inline" />
                  </button>
                </div>
              )}
              <p className="mt-5 flex items-center gap-1.5 text-[9px] leading-relaxed text-slate-500">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber-200/70" />
                {route?.isDemo !== false
                  ? "Demo stations · illustrative availability & pricing"
                  : "Availability may change before booking"}
              </p>
            </section>
            <footer className="mb-1 mt-8 flex items-center justify-between border-t border-white/[.06] pt-4 text-[9px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <Leaf size={11} />
                VoltRoute
              </span>
              <button
                onClick={() => setDialog("help")}
                className="transition hover:text-slate-200"
              >
                Help <ArrowUpRight size={11} className="ml-1 inline" />
              </button>
            </footer>
          </aside>
          <main id="main-content" className="vr-map-workspace">
            <MapComponent
              stations={stations}
              route={route}
              selectedStationId={selected?.id}
              onSelectStation={setSelected}
              savedIds={savedIds}
            />
            {mode === "route" && route && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="vr-summary-position"
              >
                <RouteSummary
                  route={route}
                  expanded={summaryExpanded}
                  onToggle={() => setSummaryExpanded((v) => !v)}
                  onSelectStation={setSelected}
                />
              </motion.div>
            )}
            <div className="vr-map-caption">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {route?.isDemo !== false
                  ? "Interactive demo"
                  : "Journey planner"}
              </span>
              <span className="hidden sm:block">
                {route ? `${route.stations.length} compatible stations` : "Choose a destination to begin"}
              </span>
            </div>
          </main>
        </div>
        {selected && (
          <BookingDrawer
            key={selected.id}
            station={selected}
            connector={input.connector}
            bookings={bookings}
            adapters={adapters}
            onClose={() => setSelected(null)}
            suggestedMinutes={route?.stops.find((st) => st.stationId === selected.id)?.minutes}
            car={adapters.cars?.length ? car : undefined}
            arrivalBattery={route?.stops.find((st) => st.stationId === selected.id)?.batteryOnArrival}
            onBooked={(booking) => {
              setBookings((items) => [...items, booking]);
              const nextBooked = [
                ...bookedStops.filter((b) => b.stationId !== booking.stationId),
                { stationId: booking.stationId, chargerId: booking.chargerId, minutes: booking.durationMinutes },
              ];
              setBookedStops(nextBooked);
              // Quick local update, then the server re-plans the whole trip around the booking.
              setRoute((r) => (r ? applyBookedStop(r, booking) : r));
              if (adapters.calculateRoute)
                adapters
                  .calculateRoute({
                    ...appliedInput,
                    bookedStops: nextBooked,
                    car: {
                      name: car.name,
                      batteryKwh: car.batteryKwh,
                      rangeKm: car.rangeKm,
                      maxDcKw: car.maxDcKw,
                      maxAcKw: car.maxAcKw,
                    },
                  })
                  .then((r) => setRoute(r))
                  .catch(() => {});
            }}
          />
        )}
        {dialog === "bookings" && (
          <Dialog title="My bookings" onClose={() => setDialog(null)}>
            <div className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Your next stops.
              </h2>
              <p className="mb-6 mt-2 text-xs text-slate-400">
                A little planning. A smoother journey.
              </p>
              {shownBookings.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays
                    size={36}
                    strokeWidth={1}
                    className="mx-auto mb-4 text-emerald-300"
                  />
                  <p className="text-sm">Your open road is waiting.</p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
                    Choose a station on the map and reserve a charging slot.
                    Your bookings will appear here.
                  </p>
                  <button
                    className="vr-primary mx-auto mt-6"
                    onClick={() => setDialog(null)}
                  >
                    Explore stations
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {(adapters.listBookings ? shownBookings : [...shownBookings].reverse()).map((booking) => (
                    <article
                      key={booking.id}
                      className="rounded-2xl border border-white/10 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-widest text-emerald-300">
                          {booking.isDemo ? "Demo booking" : booking.status || "Request sent"}
                        </span>
                        <Check size={14} className="text-emerald-300" />
                      </div>
                      <h3 className="text-sm font-medium">
                        {booking.stationName}
                      </h3>
                      <p className="mt-2 text-xs text-slate-400">
                        {booking.date} · {booking.startTime} ·{" "}
                        {booking.durationMinutes} min
                      </p>
                      <div className="mt-4 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">{booking.id}</span>
                        <span className="text-slate-300">
                          Est. {money(booking.estimatedCost)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </Dialog>
        )}
        {dialog === "help" && (
          <Dialog
            title="A little help for your journey"
            onClose={() => setDialog(null)}
          >
            <div className="space-y-5 p-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                Meet your road-trip companion.
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Choose your cities, set your departure battery, and select your
                connector. VoltRoute helps you find compatible charging stops
                along the way.
              </p>
              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p>
                  <span className="font-medium text-emerald-200">
                    Plan your way.
                  </span>{" "}
                  Enter any start and destination in India, such as Indore to
                  Mumbai. The first search for a new route can take up to a
                  minute while we look up chargers along the way.
                </p>
                <p>
                  <span className="font-medium text-emerald-200">
                    Make a stop.
                  </span>{" "}
                  Select a station on the map or in the list to explore
                  chargers, amenities, pricing, and time slots.
                </p>
                <p>
                  <span className="font-medium text-emerald-200">
                    Explore freely.
                  </span>{" "}
                  Routes and stations come from OpenStreetMap; prices are
                  estimates until the station operator confirms them. Log in to
                  book a slot the station can see.
                </p>
              </div>
              <button
                onClick={() => setDialog(null)}
                className="vr-primary w-full"
              >
                Let’s get going
                <ArrowRight size={15} className="ml-auto" />
              </button>
            </div>
          </Dialog>
        )}
        {dialog === "vehicle" && (
          <Dialog title="Your vehicle" onClose={() => setDialog(null)}>
            <div className="p-6">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
                <CarFront size={32} strokeWidth={1.4} />
              </span>
              <h2 className="text-2xl font-semibold tracking-tight">
                Ready for what’s next.
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                {car.name}: {car.batteryKwh} kWh battery, about {car.rangeKm} km
                real-world range on a full charge
                {car.maxDcKw ? `, charges at up to ${car.maxDcKw} kW DC` : ", AC charging only"}.
                {cars?.length
                  ? "Switch cars under “Your EV”, or add more in My account."
                  : "Add your own car in My account to plan with its real range."}
              </p>
              <dl className="my-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 p-4">
                  <dt className="text-xs text-slate-400">Departure battery</dt>
                  <dd className="mt-2 text-2xl text-emerald-300">
                    {input.battery}%
                  </dd>
                </div>
                <div className="rounded-xl border border-white/10 p-4">
                  <dt className="text-xs text-slate-400">Connector</dt>
                  <dd className="mt-2 text-2xl">{input.connector}</dd>
                </div>
              </dl>
              <button
                onClick={() => {
                  setDialog(null);
                  setExpanded(true);
                  // Wait for the dialog to close and the panel to open, then bring the car picker into view.
                  setTimeout(() => {
                    const picker = document.getElementById("ev-model");
                    picker?.scrollIntoView({ behavior: "smooth", block: "center" });
                    picker?.focus({ preventScroll: true });
                  }, 250);
                }}
                className="vr-primary w-full"
              >
                Adjust journey settings
                <ArrowRight size={15} className="ml-auto" />
              </button>
              <a
                className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-emerald-300"
                href="/profile"
              >
                My account
                <ArrowUpRight size={13} />
              </a>
            </div>
          </Dialog>
        )}
        <div
          className="pointer-events-none fixed bottom-5 left-1/2 z-[100] w-max max-w-[90vw] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-[#22372b] px-4 py-3 text-xs text-emerald-100 shadow-2xl"
              >
                <Check size={15} />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
