import type { DriverListQuery, UpdateDriverInput } from "@excelcabs/types";
import { useMutation, useQuery } from "@tanstack/react-query";

import { driverService } from "@/services/driver.service";

import { type QueryDomain, queryKeys } from "./keys";

const DRIVER_WRITE_INVALIDATES = ["drivers", "trips", "bookings", "dashboard"] as const satisfies readonly QueryDomain[];

/** Admin: driver accounts with `upcomingTripCount`. */
export function useDrivers(query?: DriverListQuery) {
  return useQuery({
    queryKey: queryKeys.drivers.list(query),
    queryFn: () => driverService.list(query),
  });
}

export function useCreateDriver() {
  return useMutation({ mutationFn: driverService.create, meta: { invalidates: DRIVER_WRITE_INVALIDATES } });
}

/** Also disables: `mutate({ id, patch: { status: "disabled" } })`. Omit `password` to keep it. */
export function useUpdateDriver() {
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDriverInput }) => driverService.update(id, patch),
    meta: { invalidates: DRIVER_WRITE_INVALIDATES },
  });
}
