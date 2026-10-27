"use client";
import { useState } from "react";
import { CheckCircle2, CreditCard, LoaderCircle, Smartphone, Wallet } from "lucide-react";
import { money } from "./demo-data";

const methods = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "cash", label: "Cash at station", icon: Wallet },
] as const;

// Demo checkout for a booking: choose a method and pay. No real money moves,
// and no card or UPI details are collected.
export function PaymentPanel({
  amount,
  onPay,
}: {
  amount: number;
  onPay: (method: string) => Promise<{ payment_ref: string }>;
}) {
  const [method, setMethod] = useState<string>("upi");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      setPaid((await onPay(method)).payment_ref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (paid)
    return (
      <div className="vr-pay vr-pay-done" role="status">
        <CheckCircle2 size={20} />
        <div>
          <strong>{method === "cash" ? "Pay at the station selected" : `Paid ${money(amount)} (demo)`}</strong>
          <span>{method === "cash" ? "No payment collected. Pay cash when you arrive." : `Reference ${paid}.`}</span>
        </div>
      </div>
    );

  return (
    <div className="vr-pay">
      <div className="vr-pay-head">
        <span>Pay when you are ready</span>
        <strong>{money(amount)}</strong>
      </div>
      <div className="vr-pay-methods" role="radiogroup" aria-label="Payment method">
        {methods.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={method === id}
            className={method === id ? "active" : ""}
            onClick={() => setMethod(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-200">
          {error}
        </p>
      )}
      <button type="button" className="vr-primary w-full" disabled={busy} onClick={pay}>
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {method === "cash" ? "Choose cash at station" : `Pay ${money(amount)} (demo)`}
      </button>
      <p className="vr-pay-note">You can leave and pay later. Online payments are a demo; cash is paid directly at the station.</p>
    </div>
  );
}
