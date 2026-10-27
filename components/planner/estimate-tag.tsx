// Marks a value VoltRoute has estimated rather than received from the station.
export function EstimateTag({ title, label = "Est." }: { title: string; label?: string }) {
  return (
    <span className="vr-estimate-tag" title={title}>
      {label}
    </span>
  );
}

export const estimateText = {
  price: "Estimated price. The station sets the final price.",
  chargers: "Estimated charger type and power. The station hasn’t published its charger details.",
  availability: "Estimated availability, based only on bookings made in VoltRoute, not live charger status.",
};
