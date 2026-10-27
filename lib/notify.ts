import { randomUUID } from "node:crypto";
import { getDb } from "./db";

// In-app notifications for drivers and station providers.
export function notify(userId: string, kind: string, title: string, body: string, link?: string) {
  getDb()
    .prepare("INSERT INTO notifications (id, user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), userId, kind, title, body, link ?? null);
}

/** Notify everyone who manages a station. */
export function notifyStation(stationId: string, kind: string, title: string, body: string) {
  const managers = getDb()
    .prepare("SELECT user_id FROM station_managers WHERE station_id = ?")
    .all(stationId) as { user_id: string }[];
  for (const m of managers) notify(m.user_id, kind, title, body, "/operator");
}

export function formatSlot(date: string, start: string) {
  const day = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${day} at ${start}`;
}

/**
 * Reminders: an hour before an accepted, paid-or-unpaid booking starts, remind
 * the driver and the station once. Runs whenever someone checks notifications.
 */
export function sendDueReminders() {
  const db = getDb();
  const due = db
    .prepare(
      `SELECT b.id, b.user_id, b.station_id, b.booking_date, b.start_time, s.name as station_name, u.name as user_name
       FROM bookings b JOIN stations s ON s.id = b.station_id JOIN users u ON u.id = b.user_id
       WHERE b.status = 'confirmed' AND b.operator_status = 'accepted' AND b.reminder_sent = 0
         AND datetime(b.booking_date || ' ' || b.start_time) <= datetime('now', '+5 hours', '+30 minutes', '+60 minutes')
         AND datetime(b.booking_date || ' ' || b.start_time) > datetime('now', '+5 hours', '+30 minutes')`,
    )
    .all() as any[];
  for (const b of due) {
    db.prepare("UPDATE bookings SET reminder_sent = 1 WHERE id = ?").run(b.id);
    notify(b.user_id, "reminder", "Your charging slot starts soon", `${b.station_name} · ${formatSlot(b.booking_date, b.start_time)}. Head over in time.`, "/profile#bookings");
    notifyStation(b.station_id, "reminder", "Driver arriving soon", `${b.user_name} is booked for ${formatSlot(b.booking_date, b.start_time)}.`);
  }
}
