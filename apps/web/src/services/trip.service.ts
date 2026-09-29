import type {
  CancelTripInput,
  CancelTripResult,
  CreateTripInput,
  MyTripsQuery,
  TripDetails,
  TripListQuery,
  TripSearchItem,
  TripSearchQuery,
  TripSearchResult,
  TripSummary,
  TripWithPassengers,
  UpdateTripInput,
} from "@excelcabs/types";

import { mockTripService } from "./mock/trip.mock";

export interface TripService {
  /**
   * Public. Every trip on `date` across all buses and both directions, by departure time then bus
   * name; cancelled trips are left out, departed / full ones stay (read `bookability`). On a
   * holiday, `holiday` is set and `trips` is empty.
   * @throws VALIDATION(PAST_DATE)
   */
  search(query: TripSearchQuery): Promise<TripSearchResult>;
  /** Public (booking flow). Returned even when unbookable — read `bookability`. @throws NOT_FOUND */
  getForBooking(id: string): Promise<TripSearchItem>;
  /** Admin. Sorted by date then departure time. */
  list(query?: TripListQuery): Promise<TripSummary[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<TripDetails>;
  /**
   * Admin (any trip) or driver (own trips only — others are NOT_FOUND). Passengers are the
   * non-cancelled bookings, by name. Customers get FORBIDDEN.
   */
  getWithPassengers(id: string): Promise<TripWithPassengers>;
  /** Driver. Own trips from `dateFrom` (default today) to `dateTo` (default `dateFrom`), all statuses. */
  listMine(query?: MyTripsQuery): Promise<TripSummary[]>;
  /**
   * Admin. The trip runs the bus's route in `direction`; `durationMinutes` is snapshotted from the bus.
   * @throws VALIDATION(PAST_DATE | TRIP_ON_HOLIDAY | RESOURCE_INACTIVE | TRIP_ENDS_AFTER_MIDNIGHT) ·
   *   CONFLICT(BUS_BUSY | DRIVER_BUSY — `details.conflictingTrip` is the clashing TripSummary)
   */
  create(input: CreateTripInput): Promise<TripDetails>;
  /**
   * Admin. Only scheduled trips; date and direction are locked once booked (`permissions.lockedFields`)
   * and the bus may then only change to one serving the same route. A bus change re-snapshots
   * `durationMinutes`.
   * @throws NOT_FOUND · VALIDATION (as create) · CONFLICT(TRIP_NOT_EDITABLE | TRIP_LOCKED_FIELDS |
   *   TRIP_BUS_ROUTE_MISMATCH | CAPACITY_BELOW_BOOKINGS | BUS_BUSY | DRIVER_BUSY)
   */
  update(id: string, patch: UpdateTripInput): Promise<TripDetails>;
  /** Admin. Scheduled trips only; cancels their confirmed bookings. @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION) */
  cancel(id: string, input?: CancelTripInput): Promise<CancelTripResult>;
  /** Assigned driver. @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION | TRIP_NOT_TODAY | DRIVER_HAS_ACTIVE_TRIP) */
  start(id: string): Promise<TripDetails>;
  /** Assigned driver. Completes the confirmed bookings. @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION) */
  complete(id: string): Promise<TripDetails>;
}

/** Swap point: replace with an API-backed implementation. */
export const tripService: TripService = mockTripService;
