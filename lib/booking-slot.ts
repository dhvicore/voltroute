export function validateBookingSlot(
  booking_date: unknown,
  start_time: unknown,
  duration_minutes: unknown,
  now = Date.now(),
): { error: string } | { end_time: string } {
  if (typeof duration_minutes !== "number" || !Number.isInteger(duration_minutes) || duration_minutes < 10 || duration_minutes > 120) {
    return { error: "Duration must be a whole number between 10 and 120 minutes" };
  }

  if (typeof booking_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return { error: "Booking date must use YYYY-MM-DD format" };
  }
  const calendarDate = new Date(`${booking_date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== booking_date) {
    return { error: "Booking date must be a valid calendar date" };
  }
  if (typeof start_time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time)) {
    return { error: "Start time must be a valid 24-hour time in HH:mm format" };
  }
  // The application's charging stations use India Standard Time.
  const startsAt = new Date(`${booking_date}T${start_time}:00+05:30`);
  if (startsAt.getTime() <= now) {
    return { error: "Bookings must start in the future" };
  }
  const [hours, mins] = start_time.split(":").map(Number);
  const startMinutes = hours * 60 + mins;
  const endMinutes = startMinutes + duration_minutes;
  if (endMinutes >= 24 * 60) {
    return { error: "A booking must finish before midnight on the selected date" };
  }

  const end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  return { end_time };
}
