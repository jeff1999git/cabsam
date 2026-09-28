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
   * Public. Trips on `date` from `from` to `to` (case-insensitive), departure order; cancelled
   * trips are left out. On a holiday, `holiday` is set and `trips` is empty.
   * @throws VALIDATION(PAST_DATE; from === to)
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
   * Admin. @throws VALIDATION(PAST_DATE | TRIP_ON_HOLIDAY | RESOURCE_INACTIVE | TRIP_ENDS_AFTER_MIDNIGHT) ·
   *   CONFLICT(BUS_BUSY | DRIVER_BUSY — `details.conflictingTrip` is the clashing TripSummary)
   */
  create(input: CreateTripInput): Promise<TripDetails>;
  /**
   * Admin. Only scheduled trips; date and route are locked once booked (`permissions.lockedFields`).
   * @throws NOT_FOUND · VALIDATION (as create) ·
   *   CONFLICT(TRIP_NOT_EDITABLE | TRIP_LOCKED_FIELDS | CAPACITY_BELOW_BOOKINGS | BUS_BUSY | DRIVER_BUSY)
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
