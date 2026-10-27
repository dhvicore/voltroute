/** Stable demo occupancy, never applied to provider-verified or live stations. */
export function usesSampleSchedule(station: { chargers_estimated: number; operator_verified: number; live_source?: string | null }) {
  return !!station.chargers_estimated && !station.operator_verified && !station.live_source;
}
export function sampleBusySlots(chargerId: string, date: string) {
  let hash = 0;
  for (const char of `${chargerId}:${date}`) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  // Morning, midday and evening demand differs by charger and date.
  return [9 + hash % 3, 13 + (hash >>> 4) % 3, 17 + (hash >>> 8) % 3].map((hour, index) => ({
    start_time: `${String(hour).padStart(2, "0")}:00`,
    end_time: `${String(hour + 1 + ((hash >>> (index + 12)) % 2)).padStart(2, "0")}:00`,
    duration_minutes: (1 + ((hash >>> (index + 12)) % 2)) * 60,
    status: "sample",
  }));
}
