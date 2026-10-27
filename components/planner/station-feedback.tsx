"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, LoaderCircle, MessageSquare, Star } from "lucide-react";
import { apiRequest, useSession } from "@/components/workspace/session-provider";

interface Review { id: string; user_id: string; user_name: string; rating: number; comment: string | null; created_at: string }
interface FeedbackData { reviews: Review[]; summary: { count: number; rating: number | null } }
export function StationFeedback({ stationId }: { stationId: string }) {
  const { user, isDemo } = useSession();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FeedbackData | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const url = `/api/reviews?station_id=${encodeURIComponent(stationId)}`;
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError("");
    apiRequest<FeedbackData>(url, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setData(result);
      const mine = result.reviews.find(r => r.user_id === user?.id);
      if (mine) { setRating(mine.rating); setComment(mine.comment || ""); }
    }).catch(() => { if (!controller.signal.aborted) setError("Could not load feedback. Please try again."); });
    return () => controller.abort();
  }, [open, url, user?.id, retry]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!rating || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest("/api/reviews", { method: "POST", body: JSON.stringify({ station_id: stationId, rating, comment }) });
      setMessage("Your feedback has been saved. Thank you!");
      setRetry(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save feedback. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="vr-feedback">
    <button type="button" className="vr-feedback-heading" aria-expanded={open} aria-controls={`feedback-${stationId}`} onClick={() => setOpen(!open)}>
      <MessageSquare size={16} /><span>Station feedback</span><ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : undefined }} />
    </button>
    {open && <div id={`feedback-${stationId}`} className="vr-feedback-content">
      {data && <p className="vr-feedback-summary">{data.summary.count ? `${data.summary.rating} / 5 · ${data.summary.count} rating${data.summary.count === 1 ? "" : "s"}` : "Be the first to share your experience."}</p>}
      {user && !isDemo ? <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend>Your rating</legend>
          <div className="vr-feedback-stars" role="radiogroup" aria-label="Station rating">
            {[1,2,3,4,5].map(value => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star${value === 1 ? "" : "s"}`} onClick={() => setRating(value)}><Star size={22} fill={value <= rating ? "currentColor" : "none"} /></button>)}
          </div>
          <label htmlFor={`feedback-comment-${stationId}`}>Your feedback <span>(optional)</span></label>
          <textarea id={`feedback-comment-${stationId}`} value={comment} onChange={e => setComment(e.target.value)} maxLength={1500} rows={3} placeholder="How was the charger, access, or station experience?" />
          <small>{comment.length} / 1,500 · Visible on this station</small>
        </fieldset>
        <button type="submit" className="vr-primary" disabled={!rating || busy}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <MessageSquare size={15} />}Save feedback</button>
      </form> : <p className="vr-feedback-summary"><Link href="/login?next=/planner">Log in</Link> to leave station feedback.</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry loading</button></p>}
      {message && <p role="status">{message}</p>}
      {!data && !error && <p>Loading feedback…</p>}
      {data && data.reviews.length > 0 && <ul>{data.reviews.map(review => <li key={review.id}><div><strong>{review.user_name}</strong><span aria-label={`${review.rating} out of 5 stars`}>★ {review.rating}/5</span></div>{review.comment && <p>{review.comment}</p>}<small>{new Date(review.created_at.replace(" ", "T") + "Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small></li>)}</ul>}
    </div>}
  </section>;
}
