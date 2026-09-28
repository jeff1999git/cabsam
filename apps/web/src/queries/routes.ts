import type { RouteEndpoints } from "@excelcabs/types";
import { useQuery } from "@tanstack/react-query";

import { tripService } from "@/services/trip.service";

import { queryKeys } from "./keys";

/** The stops customers can travel between, derived from the routes served by active buses. */
export interface RouteNetwork {
  routes: RouteEndpoints[];
  /** Every boarding point, alphabetical. */
  origins: string[];
  /** Destinations reachable from each boarding point, alphabetical. */
  destinationsByOrigin: Record<string, string[]>;
}

export function toRouteNetwork(routes: RouteEndpoints[]): RouteNetwork {
  const grouped = new Map<string, string[]>();
  for (const route of routes) {
    grouped.set(route.origin, [...(grouped.get(route.origin) ?? []), route.destination]);
  }
  return {
    routes,
    origins: [...grouped.keys()].toSorted(),
    destinationsByOrigin: Object.fromEntries(
      [...grouped].map(([origin, destinations]) => [origin, destinations.toSorted()]),
    ),
  };
}

const ROUTES_STALE_TIME_MS = 5 * 60_000;

/**
 * Public: the served routes as From / To options (`data.origins`, `data.destinationsByOrigin`).
 * Bus writes invalidate it, since each bus's route is what customers can book.
 */
export function useRouteNetwork() {
  return useQuery({
    queryKey: queryKeys.routes.list(),
    queryFn: tripService.listRoutes,
    staleTime: ROUTES_STALE_TIME_MS,
    select: toRouteNetwork,
  });
}
