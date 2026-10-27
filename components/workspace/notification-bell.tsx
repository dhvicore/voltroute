"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check, X } from "lucide-react";
import { apiRequest, useSession } from "./session-provider";

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const pollMs = 20000;

function timeAgo(created: string) {
  const minutes = Math.round((Date.now() - new Date(`${created.replace(" ", "T")}Z`).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

// Bell with unread count; new notifications also pop up on screen and,
// if the user allows it, as desktop alerts.
export function NotificationBell() {
  const { user, isDemo } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Item | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<{ notifications: Item[]; unread: number }>("/api/notifications");
      setItems(data.notifications);
      setUnread(data.unread);
      // Pop up anything that arrived since the last check (not on first load).
      if (seen.current) {
        const fresh = data.notifications.filter((n) => !n.read_at && !seen.current!.has(n.id));
        if (fresh[0]) {
          setToast(fresh[0]);
          if (typeof Notification !== "undefined" && Notification.permission === "granted")
            new Notification(fresh[0].title, { body: fresh[0].body, icon: "/logo.png" });
        }
      }
      seen.current = new Set(data.notifications.map((n) => n.id));
    } catch {
      /* Offline: try again on the next poll. An expired login redirects to /login. */
    }
  }, []);

  useEffect(() => {
    if (!user || isDemo) return;
    load();
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [user?.id, isDemo, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function markRead() {
    await apiRequest("/api/notifications", { method: "POST" }).catch(() => {});
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || "now" })));
  }

  if (!user || isDemo) return null;
  const canAsk = typeof Notification !== "undefined" && Notification.permission === "default";

  return (
    <div className="vr-bell" ref={panel}>
      <button
        type="button"
        className="vr-bell-button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {unread ? <BellRing size={17} /> : <Bell size={17} />}
        {unread > 0 && <span className="vr-bell-count">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="vr-bell-panel" role="dialog" aria-label="Notifications">
          <div className="vr-bell-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button onClick={markRead}>
                <Check size={13} />
                Mark all read
              </button>
            )}
          </div>
          {canAsk && (
            <button className="vr-bell-enable" onClick={() => Notification.requestPermission()}>
              Turn on desktop alerts
            </button>
          )}
          <ul>
            {items.length === 0 && <li className="vr-bell-empty">You’re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className={n.read_at ? "" : "is-unread"}>
                <a href={n.link || "#"}>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                  <small>{timeAgo(n.created_at)}</small>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {toast && (
        <div className="vr-bell-toast" role="status">
          <BellRing size={16} />
          <div>
            <strong>{toast.title}</strong>
            <span>{toast.body}</span>
          </div>
          <button aria-label="Dismiss" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
