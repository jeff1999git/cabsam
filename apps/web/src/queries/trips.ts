import type {
  CancelTripInput,
  MyTripsQuery,
  TripListQuery,
  TripSearchQuery,
  UpdateTripInput,
} from "@excelcabs/types";
import { keepPreviousData, skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { tripService } from "@/services/trip.service";

import { LIVE_REFETCH_INTERVAL_MS } from "./client";
import { type QueryDomain, queryKeys } from "./keys";

/** Trip writes change seat counts, schedules and the usage counts of buses and drivers. */
const TRIP_WRITE_INVALIDATES = [
  "trips",
  "bookings",
  "dashboard",
  "buses",
  "drivers",
] as const satisfies readonly QueryDomain[];

const TRIP_STATUS_INVALIDATES = ["trips", "bookings", "dashboard"] as const satisfies readonly QueryDomain[];

/**
 * Public search. Pass `null` until the form is valid. Keeps showing the previous results while a
 * new search loads (`isPlaceholderData`), and refreshes seat counts every minute.
 */
export function useTripSearch(query: TripSearchQuery | null) {
  return useQuery({
    queryKey: queryKeys.trips.search(query),
    queryFn: query ? () => tripService.search(query) : skipToken,
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

/** Public: the trip being booked (check `bookability`). */
export function useTripForBooking(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.trips.forBooking(id ?? ""),
    queryFn: id ? () => tripService.getForBooking(id) : skipToken,
  });
}

/** Admin schedule. */
export function useTrips(query?: TripListQuery) {
  return useQuery({
    queryKey: queryKeys.trips.list(query),
    queryFn: () => tripService.list(query),
    placeholderData: keepPreviousData,
  });
}

/** Admin: one trip with `permissions` (edit / cancel, locked fields). */
export function useTrip(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.trips.detail(id ?? ""),
    queryFn: id ? () => tripService.get(id) : skipToken,
  });
}

/** Admin, or the assigned driver (others get NOT_FOUND): trip, permissions and passenger list. */
export function useTripPassengers(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.trips.passengers(id ?? ""),
    queryFn: id ? () => tripService.getWithPassengers(id) : skipToken,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

/** Driver: own trips for a date range (default today). */
export function useMyTrips(query?: MyTripsQuery) {
  return useQuery({
    queryKey: queryKeys.trips.mine(query),
    queryFn: () => tripService.listMine(query),
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

export function useCreateTrip() {
  return useMutation({
    mutationFn: tripService.create,
    meta: { invalidates: ["trips", "dashboard", "buses", "drivers"] },
  });
}

export function useUpdateTrip() {
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTripInput }) => tripService.update(id, patch),
    meta: { invalidates: TRIP_WRITE_INVALIDATES },
  });
}

export function useCancelTrip() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: CancelTripInput }) => tripService.cancel(id, input),
    meta: { invalidates: TRIP_WRITE_INVALIDATES },
  });
}

/** Driver: `mutate(tripId)`. */
export function useStartTrip() {
  return useMutation({ mutationFn: tripService.start, meta: { invalidates: TRIP_STATUS_INVALIDATES } });
}

/** Driver: `mutate(tripId)`. */
export function useCompleteTrip() {
  return useMutation({ mutationFn: tripService.complete, meta: { invalidates: TRIP_STATUS_INVALIDATES } });
}
