import { Zap } from "lucide-react";

/** Lightweight CSS geometry: no canvas, WebGL, images or extra runtime needed. */
export function ChargingSculpture() {
  return <span className="vr-sculpture" aria-hidden="true">
    <span className="vr-sculpture-floor" />
    <span className="vr-charger-model">
      <span className="vr-charger-side" />
      <span className="vr-charger-top" />
      <span className="vr-charger-front">
        <span className="vr-charger-screen"><Zap size={12} strokeWidth={1.5} /></span>
        <span className="vr-charger-led" />
        <span className="vr-charger-base" />
      </span>
      <svg className="vr-charger-cable" viewBox="0 0 32 60" fill="none"><path d="M2 12C29 8 30 20 25 34C19 51 8 49 12 31L16 24" stroke="#52665f" strokeWidth="3" strokeLinecap="round" /><path d="M14 23L18 16" stroke="#a8d8c3" strokeWidth="5" strokeLinecap="round" /></svg>
    </span>
  </span>;
}
