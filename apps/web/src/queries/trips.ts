import type {
  CancelTripInput,
  ISODate,
  MyTripsQuery,
  TripListQuery,
  TripScheduleInput,
  UpdateTripInput,
} from "@excelcabs/types";
import { keepPreviousData, skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { tripService } from "@/services/trip.service";

import { LIVE_REFETCH_INTERVAL_MS } from "./client";
import { type QueryDomain, queryKeys } from "./keys";

/**
 * Trip writes (one trip or a whole series) change seat counts, schedules and the usage counts of
 * buses and drivers.
 */
const TRIP_WRITE_INVALIDATES = [
  "trips",
  "bookings",
  "dashboard",
  "buses",
  "drivers",
] as const satisfies readonly QueryDomain[];

const TRIP_STATUS_INVALIDATES = ["trips", "bookings", "dashboard"] as const satisfies readonly QueryDomain[];

/**
 * Public: every trip on `date` (all buses), or `closure` (Sunday / holiday) with no trips. Pass
 * `null` until the date is known. Keeps showing the previous results while a new date loads
 * (`isPlaceholderData`), and refreshes seat counts every minute.
 */
export function useTripSearch(date: ISODate | null) {
  return useQuery({
    queryKey: queryKeys.trips.search(date),
    queryFn: date ? () => tripService.search({ date }) : skipToken,
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
  });
}

/**
 * Public: the first day with service (Mon–Sat, not a holiday) on or after `from` — omitted or
 * earlier than today means today. The home page's default date; "Check next day" on a closed date
 * passes that date.
 */
export function useNextOperatingDay(from?: ISODate) {
  return useQuery({
    queryKey: queryKeys.trips.nextOperatingDay(from ?? null),
    queryFn: () => tripService.nextOperatingDay(from),
  });
}

/** Sorted, de-duplicated weekdays, so equal schedules share one cache entry and request. */
function normalizeSchedule({ date, repeat }: TripScheduleInput): TripScheduleInput {
  if (!repeat) return { date };
  const weekdays = [...new Set(repeat.weekdays)].toSorted((a, b) => a - b);
  return { date, repeat: { weekdays, until: repeat.until } };
}

/**
 * Admin: the dates the trip form's schedule would create and skip ("Creates 22 trips · skips
 * Fri 2 Oct (Gandhi Jayanti)"). Pass `toTripScheduleInput(values)` (null while incomplete), debounced;
 * render the preview only while that is non-null. Keeps the previous preview while the next loads.
 */
export function usePreviewSchedule(input: TripScheduleInput | null) {
  const schedule = input && normalizeSchedule(input);
  return useQuery({
    queryKey: queryKeys.trips.schedulePreview(schedule),
    queryFn: schedule ? () => tripService.previewSchedule(schedule) : skipToken,
    placeholderData: keepPreviousData,
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

/** Admin: one trip with `permissions` (edit / cancel, locked fields) and its `series`, if any. */
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

/**
 * Admin: resolves to a `CreateTripResult` (`trips`, `series`, `skipped`). A clash on a repeating
 * trip is CONFLICT(SCHEDULE_CONFLICT) with `details.conflicts`.
 */
export function useCreateTrip() {
  return useMutation({ mutationFn: tripService.create, meta: { invalidates: TRIP_WRITE_INVALIDATES } });
}

export function useUpdateTrip() {
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTripInput }) => tripService.update(id, patch),
    meta: { invalidates: TRIP_WRITE_INVALIDATES },
  });
}

/**
 * Admin: `mutate({ id, input: { reason, scope } })` — `scope: "series"` also cancels the series'
 * later scheduled trips. Resolves to `{ trip, cancelledTrips, cancelledBookings }`.
 */
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
