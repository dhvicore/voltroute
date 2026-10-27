/** Pick the signed-in workspace; only explicitly requested driver pages override it. */
export function authDestination(user: { is_operator?: boolean; role: string }, next?: string | null) {
  if (user.is_operator || user.role === "admin") return "/operator";
  if (next && /^\/(planner|map|profile|bookings|vehicles|dashboard)(?:[?#]|$)/.test(next)) return next;
  return "/planner";
}
