import type {
  CancelTripInput,
  CancelTripResult,
  CreateTripInput,
  CreateTripResult,
  ISODate,
  MyTripsQuery,
  TripDetails,
  TripListQuery,
  TripScheduleInput,
  TripSchedulePreview,
  TripSearchItem,
  TripSearchQuery,
  TripSearchResult,
  TripSummary,
  TripWithPassengers,
  UpdateTripInput,
} from "@excelcabs/types";

import { mockTripService } from "./mock/trip.mock";

/**
 * Trips run Monday to Saturday except holidays; every Sunday is closed. `fieldErrors` keys are the
 * input's field names, plus `weekdays` / `until` for `repeat`.
 */
export interface TripService {
  /**
   * Public. Every trip on `date` across all buses, by departure time then bus name; cancelled
   * trips are left out, departed / full ones stay (read `bookability`). On a Sunday or holiday,
   * `closure` says why and `trips` is empty.
   * @throws VALIDATION(PAST_DATE)
   */
  search(query: TripSearchQuery): Promise<TripSearchResult>;
  /**
   * Public. The first day with service (Mon–Sat, not a holiday) on or after `from` — default and
   * floor: today. For the home page's default date and "Check next day" on a closed date.
   * @throws VALIDATION
   */
  nextOperatingDay(from?: ISODate): Promise<ISODate>;
  /** Public (booking flow). Returned even when unbookable — read `bookability`. @throws NOT_FOUND */
  getForBooking(id: string): Promise<TripSearchItem>;
  /** Admin. Sorted by date then departure time. */
  list(query?: TripListQuery): Promise<TripSummary[]>;
  /** Admin. `series` is set for a trip of a repeating series. @throws NOT_FOUND */
  get(id: string): Promise<TripDetails>;
  /**
   * Admin (any trip) or driver (own trips only — others are NOT_FOUND). Passengers are the
   * non-cancelled bookings, by name. Customers get FORBIDDEN.
   */
  getWithPassengers(id: string): Promise<TripWithPassengers>;
  /** Driver. Own trips from `dateFrom` (default today) to `dateTo` (default `dateFrom`), all statuses. */
  listMine(query?: MyTripsQuery): Promise<TripSummary[]>;
  /**
   * Admin. The dates `create` would use for this schedule, and the ones it would skip (a one-time
   * Sunday, holidays) — without checking the bus, driver or clashes. For the live "Creates 22
   * trips · skips Fri 2 Oct (Gandhi Jayanti)" line.
   * @throws VALIDATION (weekdays / until as `create`)
   */
  previewSchedule(input: TripScheduleInput): Promise<TripSchedulePreview>;
  /**
   * Admin. Without `repeat`: one trip on `date`. With `repeat`: a `TripSeries` plus one trip on
   * every date in [date, repeat.until] whose weekday is in `repeat.weekdays`, skipping holidays
   * (`skipped`) — all or nothing, in one write.
   * @throws VALIDATION(PAST_DATE | NON_OPERATING_DAY (one-time Sunday) | TRIP_ON_HOLIDAY (one-time) |
   *   EMPTY_SCHEDULE (no date left, on `until`) | RESOURCE_INACTIVE | TRIP_ENDS_AFTER_MIDNIGHT) ·
   *   CONFLICT(BUS_BUSY | DRIVER_BUSY — one-time; `details.conflictingTrip` is the clashing
   *   TripSummary) · CONFLICT(SCHEDULE_CONFLICT — repeating; `details.conflicts` is a
   *   ScheduleConflict[] by date, one entry per busy bus / driver, and `fieldErrors` summarise it on
   *   `busId` / `driverId`)
   */
  create(input: CreateTripInput): Promise<CreateTripResult>;
  /**
   * Admin. One scheduled trip; a series trip stays in its series and may only move to another date
   * its series runs on. Once booked, date, origin and destination are locked
   * (`permissions.lockedFields`) and a new bus needs enough seats.
   * @throws NOT_FOUND · VALIDATION (as create) · CONFLICT(TRIP_NOT_EDITABLE | TRIP_LOCKED_FIELDS |
   *   CAPACITY_BELOW_BOOKINGS | BUS_BUSY | DRIVER_BUSY)
   */
  update(id: string, patch: UpdateTripInput): Promise<TripDetails>;
  /**
   * Admin. Scheduled trips only; cancels their confirmed bookings. `scope: "series"` also cancels
   * the series' later scheduled trips (`series.remainingTripCount` in all).
   * @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION)
   */
  cancel(id: string, input?: CancelTripInput): Promise<CancelTripResult>;
  /** Assigned driver. @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION | TRIP_NOT_TODAY | DRIVER_HAS_ACTIVE_TRIP) */
  start(id: string): Promise<TripDetails>;
  /** Assigned driver. Completes the confirmed bookings. @throws NOT_FOUND · CONFLICT(INVALID_TRANSITION) */
  complete(id: string): Promise<TripDetails>;
}

/** Swap point: replace with an API-backed implementation. */
export const tripService: TripService = mockTripService;
