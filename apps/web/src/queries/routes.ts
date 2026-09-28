import type { Route, RouteListQuery, UpdateRouteInput } from "@excelcabs/types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { isSameStop } from "@/lib/schemas/common";
import { routeService } from "@/services/route.service";

import { type QueryDomain, queryKeys } from "./keys";

const ROUTE_WRITE_INVALIDATES = ["routes", "trips", "bookings"] as const satisfies readonly QueryDomain[];

/** The stops customers can travel between, derived from the active routes. */
export interface RouteNetwork {
  routes: Route[];
  /** Every boarding point, alphabetical. */
  origins: string[];
  /** Destinations reachable from each boarding point, alphabetical. */
  destinationsByOrigin: Record<string, string[]>;
}

export function toRouteNetwork(routes: Route[]): RouteNetwork {
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

/** The route between two stops, if any (e.g. the trip form's From / To → `routeId`). */
export function findRoute(routes: readonly Route[], from: string, to: string): Route | undefined {
  return routes.find((route) => isSameStop(route.origin, from) && isSameStop(route.destination, to));
}

const ROUTES_STALE_TIME_MS = 5 * 60_000;

/** Public: active routes. */
export function useActiveRoutes() {
  return useQuery({
    queryKey: queryKeys.routes.active(),
    queryFn: routeService.listActive,
    staleTime: ROUTES_STALE_TIME_MS,
  });
}

/** Public: active routes as From / To options (`data.origins`, `data.destinationsByOrigin`). */
export function useRouteNetwork() {
  return useQuery({
    queryKey: queryKeys.routes.active(),
    queryFn: routeService.listActive,
    staleTime: ROUTES_STALE_TIME_MS,
    select: toRouteNetwork,
  });
}

/** Admin: routes with `upcomingTripCount` and `totalTripCount` (> 0 locks the stops). */
export function useRoutes(query?: RouteListQuery) {
  return useQuery({
    queryKey: queryKeys.routes.list(query),
    queryFn: () => routeService.list(query),
  });
}

export function useCreateRoute() {
  return useMutation({ mutationFn: routeService.create, meta: { invalidates: ROUTE_WRITE_INVALIDATES } });
}

/** Also deactivates: `mutate({ id, patch: { status: "inactive" } })`. */
export function useUpdateRoute() {
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRouteInput }) => routeService.update(id, patch),
    meta: { invalidates: ROUTE_WRITE_INVALIDATES },
  });
}
