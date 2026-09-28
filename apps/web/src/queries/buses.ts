import type { BusListQuery, UpdateBusInput } from "@excelcabs/types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { busService } from "@/services/bus.service";

import { type QueryDomain, queryKeys } from "./keys";

/** A bus's route is what customers can book, so bus writes also refresh the route network. */
const BUS_WRITE_INVALIDATES = ["buses", "routes", "trips", "bookings", "dashboard"] as const satisfies readonly QueryDomain[];

/** Admin: buses with `upcomingTripCount`, `totalTripCount` (> 0 locks the route) and `maxBookedOnUpcomingTrip`. */
export function useBuses(query?: BusListQuery) {
  return useQuery({
    queryKey: queryKeys.buses.list(query),
    queryFn: () => busService.list(query),
  });
}

export function useCreateBus() {
  return useMutation({ mutationFn: busService.create, meta: { invalidates: BUS_WRITE_INVALIDATES } });
}

/** Also disables: `mutate({ id, patch: { status: "inactive" } })`. */
export function useUpdateBus() {
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBusInput }) => busService.update(id, patch),
    meta: { invalidates: BUS_WRITE_INVALIDATES },
  });
}
