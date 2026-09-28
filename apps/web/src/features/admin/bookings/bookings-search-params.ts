import type { Route } from "next";

import type { BookingFilters } from "@/lib/schemas/filters";

export type BookingsHrefParams = Partial<BookingFilters>;

/** `/admin/bookings` with the given filters as its query string (empty values and page 1 are left out). */
export function bookingsHref(params: BookingsHrefParams): Route {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.date) query.set("date", params.date);
  if (params.status) query.set("status", params.status);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const search = query.toString();
  return (search ? `/admin/bookings?${search}` : "/admin/bookings") as Route;
}
