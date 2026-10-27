import type { ComponentType } from "react";
import type { EvModel } from "./ev-models";

export type Connector = "CCS2" | "Type 2" | "CHAdeMO";
export type Availability = "available" | "filling" | "full";
export type RoutePreference = "charging" | "fastest";
export interface Charger {
  id: string;
  connector: Connector;
  power: number;
  price: number;
  sessionFee: number;
  available: boolean;
}
export interface Station {
  id: string;
  name: string;
  operator: string;
  address: string;
  rating: number;
  reviews: number;
  availability: Availability;
  available: number;
  total: number;
  amenities: string[];
  chargers: Charger[];
  distanceAlongRoute: number;
  detourMinutes: number;
  mapPosition: { x: number; y: number };
  /** Real coordinates for stations from the live planner. */
  location?: { lat: number; lng: number };
  /** Details not confirmed by the station: shown with an "Estimated" tag. */
  estimates?: { price: boolean; chargers: boolean; availability: boolean };
  recommended?: boolean;
}
export interface RouteInput {
  source: string;
  destination: string;
  battery: number;
  connector: Connector;
  preference: RoutePreference;
  /** Id of the driver's chosen car (one of PlannerAdapters.cars). */
  vehicle?: string;
  /** Slots the driver has booked on this trip; the plan is rebuilt around them. */
  bookedStops?: { stationId: string; chargerId: string; minutes: number }[];
  /** The chosen car's specs, sent to the planner API. */
  car?: Pick<EvModel, "name" | "batteryKwh" | "rangeKm" | "maxDcKw" | "maxAcKw">;
}
export interface PlannedRoute {
  id: string;
  source: string;
  destination: string;
  distance: number;
  driveMinutes: number;
  arrivalBattery: number;
  chargeMinutes: number;
  estimatedCost: number;
  stops: {
    stationId: string;
    batteryOnArrival: number;
    targetBattery: number;
    minutes: number;
    /** True once the driver has booked this stop. */
    booked?: boolean;
  }[];
  stations: Station[];
  /** Replace the preview path with your provider's projected route geometry. */
  mapPath?: string;
  /** Road geometry as [lat, lng] pairs for the live map. */
  coordinates?: [number, number][];
  /** Battery % at departure, used for the live map's battery readout. */
  startBattery?: number;
  /** Full-charge range of the chosen EV, for battery maths on the map. */
  rangeKm?: number;
  batteryKwh?: number;
  maxDcKw?: number;
  maxAcKw?: number;
  vehicleName?: string;
  /** True when drive time comes from live traffic (Google Maps). */
  liveTraffic?: boolean;
  trafficUpdatedAt?: string;
  /** Estimated time spent leaving and rejoining the road for selected chargers. */
  detourMinutes?: number;
  chargingNote?: string;
  /** Shown when no safe charging plan exists for this route. */
  warning?: string;
  isDemo: boolean;
}
export interface BookingRequest {
  stationId: string;
  chargerId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  estimatedCost: number;
  /** The driver's saved car, so the price matches what it can take. */
  vehicleId?: string;
  /** Expected battery % on arrival, so the price only covers what the battery can take. */
  arrivalBattery?: number;
}
export interface Booking extends BookingRequest {
  id: string;
  stationName: string;
  isDemo: boolean;
  /** Driver-facing status from the server, e.g. "Waiting for station". */
  status?: string;
}
export interface MapViewProps {
  stations: Station[];
  route: PlannedRoute | null;
  selectedStationId?: string;
  onSelectStation: (station: Station) => void;
  savedIds: string[];
}
/** Supply these adapters to connect real routing, availability and reservations. */
export interface PlannerAdapters {
  stations?: Station[];
  calculateRoute?: (input: RouteInput) => Promise<PlannedRoute>;
  getBookedSlots?: (
    chargerId: string,
    date: string,
    signal: AbortSignal,
  ) => Promise<{ startTime: string; durationMinutes: number }[]>;
  bookSlot?: (request: BookingRequest) => Promise<{ id: string }>;
  /** Demo payment for a booking; no real money moves. */
  payBooking?: (bookingId: string, method: string) => Promise<{ payment_ref: string }>;
  /** The signed-in driver's saved bookings from the server. */
  listBookings?: () => Promise<Booking[]>;
  /** The signed-in driver's own cars; undefined for guests. */
  cars?: EvModel[];
  MapComponent?: ComponentType<MapViewProps>;
}
