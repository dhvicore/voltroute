import type { ComponentType } from "react";

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
  recommended?: boolean;
}
export interface RouteInput {
  source: string;
  destination: string;
  battery: number;
  connector: Connector;
  preference: RoutePreference;
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
  }[];
  stations: Station[];
  /** Replace the preview path with your provider's projected route geometry. */
  mapPath?: string;
  isDemo: boolean;
}
export interface BookingRequest {
  stationId: string;
  chargerId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  estimatedCost: number;
}
export interface Booking extends BookingRequest {
  id: string;
  stationName: string;
  isDemo: boolean;
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
  MapComponent?: ComponentType<MapViewProps>;
}
