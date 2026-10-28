interface BookingCharger {
  power_kw: number;
  charging_type: string;
  price_per_kwh: number;
  session_fee: number;
}
interface BookingVehicle {
  battery_capacity_kwh: number;
  max_charging_power_kw: number | null;
}

export function estimateBookingCost(
  charger: BookingCharger,
  durationMinutes: number,
  vehicle?: BookingVehicle,
  arrivalBatteryInput?: unknown,
) {
  // Missing or malformed battery readings use the planner's 20% estimate.
  const arrival = typeof arrivalBatteryInput === 'number' ? arrivalBatteryInput : NaN;
  const arrivalBattery = Number.isFinite(arrival) && arrival >= 0 && arrival <= 100 ? arrival : 20;
  const carKw = vehicle
    ? charger.charging_type === 'AC' ? 7.2 : vehicle.max_charging_power_kw || 7.2
    : charger.power_kw;
  const energyKwh = Math.round(Math.min(
    (Math.min(charger.power_kw, carKw) * durationMinutes) / 60,
    vehicle ? (vehicle.battery_capacity_kwh * (100 - arrivalBattery)) / 100 : Infinity,
  ) * 10) / 10;
  const estimatedCost = Math.round((energyKwh * charger.price_per_kwh + charger.session_fee) * 100) / 100;
  return { energyKwh, estimatedCost, depositAmount: Math.round(estimatedCost) };
}
