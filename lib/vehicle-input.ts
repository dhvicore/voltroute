// Validates a driver's car before it is saved.
export interface VehicleInput {
  make: string;
  model: string;
  battery_capacity_kwh: number;
  current_range_km: number;
  max_charging_power_kw: number;
  connector_types: string[];
}

const connectors = ["CCS2", "Type2", "CHAdeMO"];

export function parseVehicle(body: any): VehicleInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Add the car you drive." };
  const make = typeof body.make === "string" ? body.make.trim() : "";
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!make || !model || make.length > 40 || model.length > 60)
    return { error: "Enter your car’s make and model." };
  const battery = Number(body.battery_capacity_kwh);
  if (!Number.isFinite(battery) || battery < 5 || battery > 200)
    return { error: "Battery size must be between 5 and 200 kWh." };
  const range = Number(body.current_range_km);
  if (!Number.isFinite(range) || range < 50 || range > 1000)
    return { error: "Range on a full charge must be between 50 and 1000 km." };
  const power = Number(body.max_charging_power_kw ?? 0);
  if (!Number.isFinite(power) || power < 0 || power > 400)
    return { error: "Fast-charging power must be between 0 and 400 kW." };
  const types = Array.isArray(body.connector_types)
    ? body.connector_types.filter((c: unknown) => typeof c === "string" && connectors.includes(c))
    : [];
  if (types.length === 0) return { error: "Choose your car’s charging connector." };
  return {
    make,
    model,
    battery_capacity_kwh: Math.round(battery * 10) / 10,
    current_range_km: Math.round(range),
    max_charging_power_kw: Math.round(power),
    connector_types: types,
  };
}
