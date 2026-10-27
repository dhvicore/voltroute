import type { Booking, PlannedRoute } from "./types";

/**
 * Updates the trip after the driver books a charging slot: the booked stop
 * replaces the suggestion near it, and battery on arrival, charging time and
 * cost are worked out again from the booked duration and charger.
 */
export function applyBookedStop(route: PlannedRoute, booking: Booking): PlannedRoute {
  const station = route.stations.find((s) => s.id === booking.stationId);
  const charger = station?.chargers.find((c) => c.id === booking.chargerId);
  if (!station || !charger || !route.rangeKm || !route.batteryKwh) return route;
  const pctPerKm = 100 / route.rangeKm;
  const kmOf = (id: string) => route.stations.find((s) => s.id === id)?.distanceAlongRoute ?? 0;
  const carPower = charger.connector === "Type 2" ? route.maxAcKw || 7.2 : route.maxDcKw || route.maxAcKw || 7.2;
  const power = Math.min(charger.power, carPower);

  // Keep the planned stops except any within 40 km of the booked one, then add the booking.
  const planned = route.stops
    .filter((s) => s.stationId !== station.id && Math.abs(kmOf(s.stationId) - station.distanceAlongRoute) > 40)
    .map((s) => ({ ...s, booked: false }));
  const all = [
    ...planned,
    { stationId: station.id, batteryOnArrival: 0, targetBattery: 0, minutes: booking.durationMinutes, booked: true },
  ].sort((a, b) => kmOf(a.stationId) - kmOf(b.stationId));

  let battery = route.startBattery ?? 0;
  let position = 0;
  let chargeMinutes = 0;
  let cost = 0;
  const stops = all.map((s) => {
    const km = kmOf(s.stationId);
    const arrival = Math.max(0, Math.round(battery - (km - position) * pctPerKm));
    let target: number;
    if (s.booked) {
      // Energy added in the booked time, at the slower of charger and car.
      const added = ((power * s.minutes) / 60 / route.batteryKwh) * 100;
      target = Math.min(100, Math.round(arrival + added));
      cost += (((target - arrival) / 100) * route.batteryKwh) * charger.price + charger.sessionFee;
    } else {
      target = s.targetBattery;
      const stopStation = route.stations.find((x) => x.id === s.stationId);
      const price = stopStation?.chargers[0]?.price ?? charger.price;
      cost += (((target - arrival) / 100) * route.batteryKwh) * price;
    }
    chargeMinutes += s.minutes;
    battery = target;
    position = km;
    return { stationId: s.stationId, batteryOnArrival: arrival, targetBattery: target, minutes: s.minutes, booked: s.booked };
  });
  return {
    ...route,
    stops,
    chargeMinutes,
    estimatedCost: Math.round(cost),
    arrivalBattery: Math.max(0, Math.round(battery - (route.distance - position) * pctPerKm)),
  };
}
