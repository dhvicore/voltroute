"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, PlugZap } from "lucide-react";
import { apiRequest } from "./session-provider";

interface ChargerRow {
  id: string;
  connector_type: string;
  power_kw: number;
  status: string;
  price_per_kwh: number;
  session_fee: number | null;
}
interface StationInfo {
  id: string;
  name: string;
  operator_verified: number;
  status_updated_at: string | null;
}

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "In use" },
  { value: "out_of_service", label: "Out of service" },
];

// Lets a station provider publish real charger types, prices and live status.
export function ChargerEditor({ stationId }: { stationId: string }) {
  const [station, setStation] = useState<StationInfo | null>(null);
  const [chargers, setChargers] = useState<ChargerRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<ChargerRow>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<{ station: StationInfo; chargers: ChargerRow[] }>(
        `/api/operator/chargers?station_id=${encodeURIComponent(stationId)}`,
      );
      setStation(data.station);
      setChargers(data.chargers);
      setDrafts({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load chargers.");
    }
  }, [stationId]);
  useEffect(() => {
    load();
  }, [load]);

  const value = (c: ChargerRow) => ({ ...c, ...drafts[c.id] });
  const edit = (id: string, patch: Partial<ChargerRow>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  async function save(id: string, patch: Partial<ChargerRow>) {
    setSaving(id);
    setError(null);
    try {
      await apiRequest(`/api/operator/chargers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSaved(id);
      setTimeout(() => setSaved((s) => (s === id ? null : s)), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this charger.");
    } finally {
      setSaving(null);
    }
  }
  async function add() {
    setSaving("new");
    setError(null);
    try {
      await apiRequest("/api/operator/chargers", {
        method: "POST",
        body: JSON.stringify({
          station_id: stationId,
          connector_type: "CCS2",
          power_kw: 60,
          price_per_kwh: 18,
          status: "available",
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add a charger.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="operator-chargers">
      <div className="operator-chargers-head">
        <div>
          <h2>
            <PlugZap size={18} />
            Your chargers
          </h2>
          <p>
            {station?.operator_verified
              ? "Drivers see these details as confirmed by your station."
              : "Drivers currently see VoltRoute’s estimates. Save your real details to replace them."}
          </p>
        </div>
        <button className="operator-link" onClick={add} disabled={saving === "new"}>
          {saving === "new" ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
          Add charger
        </button>
      </div>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      <div className="operator-charger-list">
        {chargers.map((charger, index) => {
          const v = value(charger);
          const dirty = !!drafts[charger.id];
          return (
            <div key={charger.id} className={`operator-charger status-${v.status}`}>
              <span className="operator-charger-index">#{index + 1}</span>
              <label>
                Live status
                <select
                  value={v.status}
                  onChange={(e) => save(charger.id, { status: e.target.value })}
                  disabled={saving === charger.id}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Connector
                <select
                  value={v.connector_type}
                  onChange={(e) => edit(charger.id, { connector_type: e.target.value })}
                >
                  <option value="CCS2">CCS2 (DC)</option>
                  <option value="CHAdeMO">CHAdeMO (DC)</option>
                  <option value="Type2">Type 2 (AC)</option>
                </select>
              </label>
              <label>
                Power (kW)
                <input
                  type="number"
                  min={3}
                  max={400}
                  step="0.1"
                  value={v.power_kw}
                  onChange={(e) => edit(charger.id, { power_kw: Number(e.target.value) })}
                />
              </label>
              <label>
                Price (₹/kWh)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={v.price_per_kwh}
                  onChange={(e) => edit(charger.id, { price_per_kwh: Number(e.target.value) })}
                />
              </label>
              <button
                className="operator-accept operator-charger-save"
                disabled={!dirty || saving === charger.id}
                onClick={() => save(charger.id, drafts[charger.id])}
              >
                {saving === charger.id ? (
                  <LoaderCircle size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                {saved === charger.id ? "Saved" : "Save"}
              </button>
            </div>
          );
        })}
        {chargers.length === 0 && <p className="account-note">No chargers listed yet. Add your first one.</p>}
      </div>
    </section>
  );
}
