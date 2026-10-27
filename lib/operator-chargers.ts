import { getDb } from "./db";

const connectors = ["CCS2", "Type2", "CHAdeMO"];
const statuses = ["available", "occupied", "out_of_service"];

type Fields = {
  connector_type?: string;
  charging_type?: string;
  power_kw?: number;
  price_per_kwh?: number;
  session_fee?: number;
  status?: string;
};

// Validates charger details sent by a station provider.
export function chargerFields(body: any, required: boolean): Fields | { error: string } {
  if (!body || typeof body !== "object") return { error: "Send charger details as JSON" };
  const out: Fields = {};
  if (body.connector_type !== undefined || required) {
    if (!connectors.includes(body.connector_type)) return { error: "Connector must be CCS2, Type2 or CHAdeMO" };
    out.connector_type = body.connector_type;
    out.charging_type = body.connector_type === "Type2" ? "AC" : "DC";
  }
  if (body.power_kw !== undefined || required) {
    const power = Number(body.power_kw);
    if (!Number.isFinite(power) || power < 3 || power > 400) return { error: "Power must be between 3 and 400 kW" };
    out.power_kw = Math.round(power * 10) / 10;
  }
  if (body.price_per_kwh !== undefined || required) {
    const price = Number(body.price_per_kwh);
    if (!Number.isFinite(price) || price < 0 || price > 100) return { error: "Price must be between ₹0 and ₹100 per kWh" };
    out.price_per_kwh = Math.round(price * 100) / 100;
  }
  if (body.session_fee !== undefined) {
    const fee = Number(body.session_fee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 1000) return { error: "Session fee must be between ₹0 and ₹1000" };
    out.session_fee = Math.round(fee * 100) / 100;
  }
  if (body.status !== undefined || required) {
    const status = body.status ?? "available";
    if (!statuses.includes(status)) return { error: "Status must be available, occupied or out_of_service" };
    out.status = status;
  }
  return out;
}

// Provider-entered details replace VoltRoute's estimates for this station.
export function markVerified(stationId: string) {
  getDb()
    .prepare(
      "UPDATE stations SET operator_verified = 1, chargers_estimated = 0, status_updated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    )
    .run(stationId);
}
