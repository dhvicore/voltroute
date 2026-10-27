import type { Connector } from "./types";

export interface EvModel {
  id: string;
  name: string;
  batteryKwh: number;
  /** Typical real-world highway range on a full charge, below the ARAI/MIDC figure. */
  rangeKm: number;
  connector: Connector;
  /** Peak charging power the car accepts. */
  maxDcKw: number;
  maxAcKw: number;
}

// Approximate published battery sizes and charging limits for EVs sold in India;
// ranges are typical real-world figures (roughly 70–80 % of the certified range).
export const evModels: EvModel[] = [
  { id: "tata-nexon-ev-45", name: "Tata Nexon EV · 45 kWh", batteryKwh: 45, rangeKm: 350, connector: "CCS2", maxDcKw: 60, maxAcKw: 7.2 },
  { id: "tata-nexon-ev-30", name: "Tata Nexon EV · 30 kWh", batteryKwh: 30, rangeKm: 230, connector: "CCS2", maxDcKw: 50, maxAcKw: 7.2 },
  { id: "tata-punch-ev-35", name: "Tata Punch EV · 35 kWh", batteryKwh: 35, rangeKm: 300, connector: "CCS2", maxDcKw: 50, maxAcKw: 7.2 },
  { id: "tata-tiago-ev-24", name: "Tata Tiago EV · 24 kWh", batteryKwh: 24, rangeKm: 200, connector: "CCS2", maxDcKw: 25, maxAcKw: 7.2 },
  { id: "tata-curvv-ev-55", name: "Tata Curvv EV · 55 kWh", batteryKwh: 55, rangeKm: 400, connector: "CCS2", maxDcKw: 70, maxAcKw: 7.2 },
  { id: "mg-zs-ev", name: "MG ZS EV · 50 kWh", batteryKwh: 50.3, rangeKm: 350, connector: "CCS2", maxDcKw: 50, maxAcKw: 7.4 },
  { id: "mg-windsor-ev", name: "MG Windsor EV · 38 kWh", batteryKwh: 38, rangeKm: 260, connector: "CCS2", maxDcKw: 45, maxAcKw: 7.4 },
  { id: "mg-comet-ev", name: "MG Comet EV · 17 kWh (AC only)", batteryKwh: 17.3, rangeKm: 170, connector: "Type 2", maxDcKw: 0, maxAcKw: 3.3 },
  { id: "mahindra-xuv400", name: "Mahindra XUV400 · 39 kWh", batteryKwh: 39.4, rangeKm: 320, connector: "CCS2", maxDcKw: 50, maxAcKw: 7.2 },
  { id: "mahindra-be6-79", name: "Mahindra BE 6 · 79 kWh", batteryKwh: 79, rangeKm: 500, connector: "CCS2", maxDcKw: 175, maxAcKw: 11 },
  { id: "mahindra-xev9e-79", name: "Mahindra XEV 9e · 79 kWh", batteryKwh: 79, rangeKm: 500, connector: "CCS2", maxDcKw: 175, maxAcKw: 11 },
  { id: "hyundai-creta-electric", name: "Hyundai Creta Electric · 51 kWh", batteryKwh: 51.4, rangeKm: 390, connector: "CCS2", maxDcKw: 50, maxAcKw: 11 },
  { id: "hyundai-ioniq5", name: "Hyundai Ioniq 5 · 73 kWh", batteryKwh: 72.6, rangeKm: 450, connector: "CCS2", maxDcKw: 220, maxAcKw: 11 },
  { id: "byd-atto3", name: "BYD Atto 3 · 60 kWh", batteryKwh: 60.5, rangeKm: 420, connector: "CCS2", maxDcKw: 80, maxAcKw: 7 },
  { id: "byd-seal", name: "BYD Seal · 83 kWh", batteryKwh: 82.6, rangeKm: 520, connector: "CCS2", maxDcKw: 150, maxAcKw: 7 },
  { id: "kia-ev6", name: "Kia EV6 · 77 kWh", batteryKwh: 77.4, rangeKm: 500, connector: "CCS2", maxDcKw: 240, maxAcKw: 11 },
];

export const defaultEvModel = evModels[0];

export function findEvModel(id?: string | null) {
  return evModels.find((m) => m.id === id) || defaultEvModel;
}
