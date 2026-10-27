"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, useSession } from "@/components/workspace/session-provider";
import { LiveMap } from "./live-map";
import { VoltRoutePlanner } from "./volt-route-planner";
import type { BookingRequest, PlannedRoute, PlannerAdapters, RouteInput, Station } from "./types";
import type { EvModel } from "./ev-models";

interface SavedVehicle {
  id: string;
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_range_km: number | null;
  max_charging_power_kw: number | null;
  connector_types: string[];
}

function toCar(v: SavedVehicle): EvModel {
  const connector = v.connector_types[0] === "Type2" ? "Type 2" : v.connector_types[0] === "CHAdeMO" ? "CHAdeMO" : "CCS2";
  return {
    id: v.id,
    name: `${v.make} ${v.model}`,
    batteryKwh: v.battery_capacity_kwh,
    // Older cars may lack a range; about 6.5 km per kWh is typical highway use.
    rangeKm: v.current_range_km || Math.round(v.battery_capacity_kwh * 6.5),
    connector,
    maxDcKw: v.max_charging_power_kw || 0,
    maxAcKw: 7.2,
  };
}

// Real routes, stations and availability for everyone; signed-in drivers book
// real slots that station operators can see.
export function ConnectedPlanner() {
  const { user, isDemo, loading } = useSession();
  const router = useRouter();
  const live = !!user && !isDemo;
  // Station providers manage bookings; they don't plan or book trips.
  const operator = !!user?.is_operator && user.role !== "admin";
  const [stations, setStations] = useState<Station[]>([]);
  const [cars, setCars] = useState<EvModel[] | undefined>(undefined);
  useEffect(() => {
    if (!live) {
      setCars(undefined);
      return;
    }
    apiRequest<{ vehicles: SavedVehicle[] }>("/api/vehicles")
      .then((d) => setCars(d.vehicles.map(toCar)))
      .catch(() => setCars([]));
  }, [live]);
  useEffect(() => {
    if (operator) router.replace("/operator");
    // Drivers need a car before planning: range and battery come from it.
    else if (live && cars && cars.length === 0) router.replace("/add-car?next=/planner");
  }, [operator, router, live, cars]);

  const calculateRoute = useCallback(async (input: RouteInput) => {
    const { route } = await apiRequest<{ route: PlannedRoute }>("/api/journey", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setStations(route.stations);
    return route;
  }, []);

  const getBookedSlots = useCallback(
    async (chargerId: string, date: string, signal: AbortSignal) => {
      const data = await apiRequest<{
        booked_slots: { start_time: string; duration_minutes: number }[];
      }>(`/api/chargers/${encodeURIComponent(chargerId)}/availability?date=${date}`, { signal });
      return data.booked_slots.map((slot) => ({
        startTime: slot.start_time,
        durationMinutes: slot.duration_minutes,
      }));
    },
    [],
  );

  const bookSlot = useCallback(
    async (request: BookingRequest) => {
      if (!live) throw new Error("Log in as an EV driver to book this charging slot.");
      const data = await apiRequest<{ booking: { id: string } }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          station_id: request.stationId,
          charger_id: request.chargerId,
          booking_date: request.date,
          start_time: request.startTime,
          duration_minutes: request.durationMinutes,
          vehicle_id: request.vehicleId,
          arrival_battery: request.arrivalBattery,
        }),
      });
      return { id: data.booking.id };
    },
    [live],
  );

  const payBooking = useCallback(
    (bookingId: string, method: string) =>
      apiRequest<{ payment_ref: string }>(`/api/bookings/${encodeURIComponent(bookingId)}/pay`, {
        method: "POST",
        body: JSON.stringify({ method }),
      }),
    [],
  );

  const listBookings = useCallback(async () => {
    const { bookings } = await apiRequest<{ bookings: any[] }>("/api/bookings");
    return bookings.map((b) => ({
      id: b.id,
      stationId: b.station_id,
      chargerId: b.charger_id,
      stationName: b.station_name,
      date: b.booking_date,
      startTime: b.start_time,
      durationMinutes: b.duration_minutes,
      estimatedCost: b.estimated_cost ?? 0,
      isDemo: false,
      status:
        b.operator_status === "declined"
          ? "Declined by station"
          : b.status === "cancelled"
            ? "Cancelled"
            : b.operator_status === "accepted"
              ? "Accepted"
              : "Waiting for station",
    }));
  }, []);

  const adapters = useMemo<PlannerAdapters>(
    () => ({
      stations,
      cars,
      calculateRoute,
      getBookedSlots,
      bookSlot,
      ...(live ? { listBookings, payBooking } : {}),
      MapComponent: LiveMap,
    }),
    [stations, cars, calculateRoute, getBookedSlots, bookSlot, live, listBookings, payBooking],
  );
  if (loading || operator || (live && (cars === undefined || cars.length === 0))) return null;
  return <VoltRoutePlanner key={live ? "live" : "guest"} adapters={adapters} />;
}
