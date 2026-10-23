"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  LoaderCircle,
  MapPin,
  PlugZap,
  ShieldCheck,
  Star,
  Wifi,
  Zap,
} from "lucide-react";
import { Dialog } from "./dialog";
import {
  availabilityLabel,
  availabilityStyle,
  localDate,
  money,
} from "./demo-data";
import type {
  Booking,
  BookingRequest,
  Connector,
  PlannerAdapters,
  Station,
} from "./types";

interface Props {
  station: Station;
  connector: Connector;
  bookings: Booking[];
  adapters: PlannerAdapters;
  onClose: () => void;
  onBooked: (booking: Booking) => void;
}
const minutes = (time: string) =>
  Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
export const overlaps = (
  start: string,
  duration: number,
  otherStart: string,
  otherDuration: number,
) =>
  minutes(start) < minutes(otherStart) + otherDuration &&
  minutes(start) + duration > minutes(otherStart);
function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

export function BookingDrawer({
  station,
  connector,
  bookings,
  adapters,
  onClose,
  onBooked,
}: Props) {
  const [chargerId, setChargerId] = useState(
    station.chargers.find((c) => c.connector === connector && c.available)
      ?.id ||
      station.chargers.find((c) => c.available)?.id ||
      station.chargers[0].id,
  );
  const [date, setDate] = useState(tomorrow);
  const [duration, setDuration] = useState(30);
  const [slot, setSlot] = useState<string | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<
    { startTime: string; durationMinutes: number }[]
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const reduceMotion = useReducedMotion();
  const charger = station.chargers.find((c) => c.id === chargerId)!;
  const isDemo = !adapters.bookSlot;
  const energy = (charger.power * duration) / 60;
  const total =
    Math.round((energy * charger.price + charger.sessionFee) * 100) / 100;
  useEffect(() => {
    setSlot(null);
    setAvailabilityError(null);
    setRemoteSlots([]);
    if (!adapters.getBookedSlots || !date) {
      setLoadingSlots(false);
      return;
    }
    const controller = new AbortController();
    setLoadingSlots(true);
    adapters
      .getBookedSlots(chargerId, date, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRemoteSlots(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setAvailabilityError(
            err instanceof Error
              ? err.message
              : "Could not load availability. Please try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [chargerId, date, adapters.getBookedSlots]);
  const bookedSlots = useMemo(
    () => [
      ...(!adapters.getBookedSlots
        ? [
            { startTime: "10:00", durationMinutes: 60 },
            { startTime: "13:00", durationMinutes: 60 },
            { startTime: "17:00", durationMinutes: 60 },
          ]
        : remoteSlots),
      ...bookings.filter((b) => b.chargerId === chargerId && b.date === date),
    ],
    [adapters.getBookedSlots, remoteSlots, bookings, chargerId, date],
  );
  const unavailableReason = (time: string) => {
    if (!charger.available || station.availability === "full")
      return "Unavailable";
    if (new Date(`${date}T${time}:00`).getTime() <= Date.now())
      return "Past slot";
    if (minutes(time) + duration > 21 * 60) return "After closing";
    if (
      bookedSlots.some((b) =>
        overlaps(time, duration, b.startTime, b.durationMinutes),
      )
    )
      return "Booked";
    return null;
  };
  async function confirm() {
    if (!slot || loading) return;
    if (date < localDate() || unavailableReason(slot)) {
      setError("This slot is no longer available. Please choose another time.");
      setSlot(null);
      return;
    }
    setLoading(true);
    setError(null);
    const request: BookingRequest = {
      stationId: station.id,
      chargerId,
      date,
      startTime: slot,
      durationMinutes: duration,
      estimatedCost: total,
    };
    try {
      const result = adapters.bookSlot
        ? await adapters.bookSlot(request)
        : { id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}` };
      const booking: Booking = {
        ...request,
        id: result.id,
        stationName: station.name,
        isDemo,
      };
      onBooked(booking);
      setConfirmed(booking);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t reserve this slot. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog
      title={confirmed ? "Your charging stop" : "Station details & booking"}
      onClose={onClose}
    >
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="confirmed"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-10 text-center"
          >
            <span className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
              <CheckCircle2 size={38} strokeWidth={1.5} />
            </span>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[.2em] text-emerald-300">
              {confirmed.isDemo
                ? "Demo reservation saved"
                : "Booking confirmed"}
            </p>
            <h3 className="text-3xl font-semibold tracking-tight">
              A spot for your next stop.
            </h3>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              {confirmed.isDemo
                ? "Your preview booking is saved on this device. No real charging slot has been reserved."
                : "Your charging slot is reserved. You’re ready for the road ahead."}
            </p>
            <div className="my-7 rounded-2xl border border-white/10 bg-white/[.02] p-5 text-left">
              <p className="text-sm font-medium">{station.name}</p>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {slot} · {duration} min
              </p>
              <p className="mt-2 text-xs text-emerald-300">
                {charger.connector} · {charger.power} kW · Est. {money(total)}
              </p>
              <p className="mt-4 border-t border-white/10 pt-3 font-mono text-[10px] text-slate-500">
                Reference {confirmed.id}
              </p>
            </div>
            <button onClick={onClose} className="vr-primary w-full">
              Back to the journey
              <ArrowRight size={16} className="ml-auto" />
            </button>
          </motion.div>
        ) : (
          <motion.div key="details" initial={false} animate={{ opacity: 1 }}>
            <div className="relative overflow-hidden border-b border-white/[.07] bg-gradient-to-br from-emerald-300/[.08] via-transparent to-emerald-300/[.02] px-6 pb-6 pt-7">
              <div className="absolute right-4 top-3 -rotate-12 text-emerald-200/[.045]">
                <PlugZap size={150} strokeWidth={1} />
              </div>
              <span
                className={`relative inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${availabilityStyle[station.availability]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {availabilityLabel[station.availability]} · {station.available}{" "}
                of {station.total} chargers
              </span>
              <h3 className="relative mt-4 text-[26px] font-semibold leading-tight tracking-tight">
                {station.name}
              </h3>
              <p className="relative mt-2 text-xs text-slate-400">
                Operated by {station.operator}
              </p>
              <div className="relative mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                {station.address}
              </div>
              <div className="relative mt-3 flex items-center gap-1.5 text-xs">
                <Star
                  size={12}
                  className="text-amber-200"
                  fill="currentColor"
                />
                {station.rating}
                <span className="text-slate-500">
                  ({station.reviews} reviews)
                </span>
                <span className="mx-2 text-slate-600">·</span>
                <Clock3 size={12} className="text-slate-400" />
                <span className="text-slate-400">
                  {station.detourMinutes} min detour
                </span>
              </div>
              <div className="relative mt-5 flex flex-wrap gap-2">
                {station.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[.08] px-2.5 py-1.5 text-[10px] text-slate-300"
                  >
                    {amenity === "Café" ? (
                      <Coffee size={12} />
                    ) : amenity === "Wi-Fi" ? (
                      <Wifi size={12} />
                    ) : (
                      <Check size={12} />
                    )}
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-6 p-6">
              <p className="flex items-start gap-2 rounded-xl bg-emerald-300/[.06] p-3 text-[11px] leading-relaxed text-emerald-200">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                {isDemo
                  ? "Demo availability and pricing. Explore the booking flow without making a real reservation."
                  : "Availability is checked for your selected date. Final pricing is confirmed by the operator."}
              </p>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Choose your charger
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {station.chargers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={chargerId === c.id}
                      disabled={!c.available}
                      onClick={() => {
                        setChargerId(c.id);
                        setSlot(null);
                      }}
                      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${chargerId === c.id ? "border-emerald-300/50 bg-emerald-300/[.06]" : "border-white/10 hover:border-white/25"}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Zap size={18} className="text-emerald-300" />
                        <span className="text-[10px] text-slate-400">
                          {c.connector}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {c.power} kW{" "}
                        <span className="text-[10px] font-normal text-slate-400">
                          {c.power >= 100
                            ? "Ultra-fast"
                            : c.power >= 50
                              ? "DC Fast"
                              : "AC"}
                        </span>
                      </p>
                      <p className="mt-1.5 text-xs text-emerald-300">
                        {money(c.price)}
                        <span className="text-slate-400"> / kWh</span>
                      </p>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid grid-cols-2 items-end gap-4">
                <label className="block text-xs text-slate-300">
                  <span className="mb-2 flex items-center gap-2">
                    <CalendarDays size={14} />
                    Charging date
                  </span>
                  <input
                    type="date"
                    min={localDate()}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setSlot(null);
                    }}
                    required
                    className="vr-input w-full"
                  />
                </label>
                <label className="block text-xs text-slate-300">
                  <span className="mb-2 flex items-center gap-2">
                    <Clock3 size={14} />
                    Duration
                  </span>
                  <select
                    value={duration}
                    onChange={(e) => {
                      setDuration(Number(e.target.value));
                      setSlot(null);
                    }}
                    className="vr-input w-full"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </label>
              </div>
              <fieldset disabled={loadingSlots || !!availabilityError || !date}>
                <legend className="mb-3 flex w-full items-center justify-between text-sm font-medium">
                  Pick a time slot
                  <span className="text-[10px] font-normal text-slate-500">
                    Station local time
                  </span>
                </legend>
                {loadingSlots ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 py-4 text-xs text-slate-400"
                  >
                    <LoaderCircle size={16} className="animate-spin" />
                    Checking availability…
                  </p>
                ) : availabilityError ? (
                  <p role="alert" className="text-xs text-rose-200">
                    {availabilityError}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from(
                      { length: 13 },
                      (_, i) => `${String(i + 8).padStart(2, "0")}:00`,
                    ).map((time) => {
                      const reason = unavailableReason(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!!reason}
                          title={reason || "Available"}
                          aria-pressed={slot === time}
                          aria-label={`${time}, ${reason || "available"}`}
                          onClick={() => {
                            setSlot(time);
                            setError(null);
                          }}
                          className={`rounded-lg border px-2 py-2.5 text-xs transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-white/[.025] disabled:text-slate-600 disabled:line-through ${slot === time ? "border-emerald-300 bg-emerald-300 text-[#14271e]" : "border-white/10 text-slate-300 hover:border-emerald-300/40"}`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 flex items-center gap-4 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-sm bg-emerald-300" />
                    Selected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-sm bg-slate-600" />
                    Booked / unavailable
                  </span>
                </p>
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-rose-300/10 p-3 text-xs leading-relaxed text-rose-200"
                >
                  {error}
                </p>
              )}
            </div>
            <footer className="sticky bottom-0 border-t border-white/10 bg-[#18231f]/95 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    Estimated session total
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {duration} min · up to {energy.toFixed(1)} kWh
                    {charger.sessionFee > 0
                      ? ` · ${money(charger.sessionFee)} fee included`
                      : ""}
                  </p>
                </div>
                <p className="text-2xl font-semibold tracking-tight">
                  {money(total)}
                </p>
              </div>
              <button
                onClick={confirm}
                disabled={
                  !slot ||
                  loading ||
                  loadingSlots ||
                  !!availabilityError ||
                  !date ||
                  date < localDate()
                }
                className="vr-primary w-full"
              >
                {loading ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {loading
                  ? "Reserving your slot…"
                  : isDemo
                    ? "Confirm demo booking"
                    : "Confirm booking"}
                <ArrowRight size={16} className="ml-auto" />
              </button>
              <p className="mt-3 text-center text-[9px] leading-relaxed text-slate-500">
                Estimate at rated power. Actual cost depends on energy
                delivered.
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
