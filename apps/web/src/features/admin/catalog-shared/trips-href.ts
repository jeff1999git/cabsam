import type { Route } from "next";

export type TripsFilterParam = "busId" | "driverId";

/** `/admin/trips` narrowed to one bus or driver; the trips screen shows the filter as a chip. */
export function tripsFilterHref(param: TripsFilterParam, id: string): Route {
  return `/admin/trips?${param}=${encodeURIComponent(id)}`;
}
