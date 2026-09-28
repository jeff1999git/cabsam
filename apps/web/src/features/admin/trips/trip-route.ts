import type { RouteEndpoints, TripDirection, TripSummary } from "@excelcabs/types";

export const TRIP_DIRECTION_LABEL: Record<TripDirection, string> = {
  outbound: "Outbound",
  return: "Return",
};

/** The stops a trip runs between when a bus with route `bus` runs in `direction`. */
export function directionEndpoints(bus: RouteEndpoints, direction: TripDirection): RouteEndpoints {
  return direction === "outbound"
    ? { origin: bus.origin, destination: bus.destination }
    : { origin: bus.destination, destination: bus.origin };
}

/** A trip's bus route (its outbound pair), recovered from the trip's own route and direction. */
export function busRouteOf(trip: Pick<TripSummary, "route" | "direction">): RouteEndpoints {
  // An outbound trip already runs the bus's pair; reversing a return trip's stops gives it back.
  return directionEndpoints(trip.route, trip.direction);
}

/** 'Shakthan Stand ⇄ SmartCity' */
export function formatBusRoute(route: RouteEndpoints): string {
  return `${route.origin} ⇄ ${route.destination}`;
}
