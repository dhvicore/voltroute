import type { PlannedRoute, RouteInput, Station } from "@/components/planner/types";
import type { EvModel } from "@/components/planner/ev-models";

const reservePct = 12;
const arrivalReservePct = 15;
export class ChargingPlanError extends Error {}

/** Plan only the charge needed for the remaining trip, limited by car and charger. */
export function planChargingStops(input: RouteInput, distance: number, stations: Station[], car: EvModel) {
  const powerFor = (connector: string, power: number) => Math.min(power, connector === "Type 2" ? car.maxAcKw : car.maxDcKw);
  const usable = stations.filter(s => s.chargers.some(c => c.connector === input.connector && c.available && powerFor(c.connector, c.power) > 0)).sort((a,b) => a.distanceAlongRoute - b.distanceAlongRoute);
  const byId = new Map(stations.map(s => [s.id, s]));
  const booked = (input.bookedStops || []).map(b => ({ ...b, station: byId.get(b.stationId) }));
  if (booked.some(b => !b.station)) throw new ChargingPlanError("A booked station is no longer on this route. Review your charging stops.");
  booked.sort((a,b) => a.station!.distanceAlongRoute - b.station!.distanceAlongRoute);
  const pctPerKm = 100 / car.rangeKm;
  const stops: PlannedRoute["stops"] = [];
  let position = 0, battery = input.battery, chargeMinutes = 0, cost = 0, detourMinutes = 0;

  const reach = (goalKm: number, isBookedStop: boolean) => {
    const reserve = isBookedStop ? reservePct : arrivalReservePct;
    while (battery - (goalKm - position) * pctPerKm < reserve) {
      if (stops.length >= 20) throw new ChargingPlanError("Too many charging stops are needed for this journey.");
      const ahead = usable.filter(s => s.distanceAlongRoute > position + 0.1 && s.distanceAlongRoute < goalKm - 0.1);
      const options = ahead.flatMap(station => {
        const arrival = battery - (station.distanceAlongRoute - position) * pctPerKm;
        // Never place an unreachable station in a recommendation.
        if (arrival < 3) return [];
        const charger = station.chargers.filter(c => c.available && c.connector === input.connector && powerFor(c.connector, c.power) > 0)
          .sort((a,b) => powerFor(b.connector,b.power) - powerFor(a.connector,a.power))[0];
        const neededForGoal = Math.ceil((goalKm - station.distanceAlongRoute) * pctPerKm + reserve);
        let target = neededForGoal;
        if (neededForGoal > 80) {
          const next = usable.find(s => s.distanceAlongRoute > station.distanceAlongRoute + 0.1 && s.distanceAlongRoute < goalKm);
          const neededForNext = next ? Math.ceil((next.distanceAlongRoute - station.distanceAlongRoute) * pctPerKm + reservePct) : neededForGoal;
          target = Math.min(100, Math.max(80, neededForNext));
        }
        if (target > 100 || target <= arrival) return [];
        const energy = ((target - arrival) / 100) * car.batteryKwh;
        const power = powerFor(charger.connector, charger.power);
        // Include losses, slower charging above 80%, and a small plug-in allowance.
        const taperEnergy = Math.max(0, target - Math.max(80, arrival)) / 100 * car.batteryKwh;
        const minutes = Math.max(10, Math.ceil(((energy + taperEnergy) / (power * 0.9) * 60 + 5) / 5) * 5);
        const detour = Math.max(0, station.detourMinutes);
        const score = minutes + detour + (input.preference === "charging" && station.available === 0 ? 10 : 0);
        return [{ station, arrival, charger, target, energy, minutes, detour, score }];
      });
      const safe = options.filter(o => o.arrival >= reservePct);
      const candidates = safe.length ? safe : options;
      candidates.sort((a,b) => a.score - b.score || b.station.distanceAlongRoute - a.station.distanceAlongRoute);
      const chosen = candidates[0];
      if (!chosen) throw new ChargingPlanError("No compatible charging stop is reachable with your current battery. Increase departure charge or choose another compatible connector.");
      stops.push({ stationId: chosen.station.id, batteryOnArrival: Math.floor(chosen.arrival), targetBattery: chosen.target, minutes: chosen.minutes });
      chargeMinutes += chosen.minutes;
      detourMinutes += chosen.detour;
      cost += chosen.energy * chosen.charger.price + chosen.charger.sessionFee;
      position = chosen.station.distanceAlongRoute;
      battery = chosen.target;
    }
  };

  for (const b of booked) {
    const station = b.station!;
    reach(station.distanceAlongRoute, true);
    const arrival = battery - (station.distanceAlongRoute - position) * pctPerKm;
    const charger = station.chargers.find(c => c.id === b.chargerId && c.available);
    if (!charger || powerFor(charger.connector, charger.power) <= 0) throw new ChargingPlanError("A booked charger is unavailable or incompatible with your car.");
    const power = powerFor(charger.connector, charger.power);
    const target = Math.min(100, arrival + power * b.minutes / 60 * 0.9 / car.batteryKwh * 100);
    const energy = Math.max(0, target - arrival) / 100 * car.batteryKwh;
    stops.push({ stationId: station.id, batteryOnArrival: Math.floor(arrival), targetBattery: Math.floor(target), minutes: b.minutes, booked: true });
    chargeMinutes += b.minutes;
    detourMinutes += Math.max(0, station.detourMinutes);
    cost += energy * charger.price + charger.sessionFee;
    position = station.distanceAlongRoute;
    battery = target;
  }
  reach(distance, false);
  return { stops, chargeMinutes, detourMinutes, estimatedCost: Math.round(cost), arrivalBattery: Math.max(0, Math.floor(battery - (distance - position) * pctPerKm)) };
}
