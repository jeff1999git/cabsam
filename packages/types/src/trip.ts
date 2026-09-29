import type { BookingStatus } from "./booking";
import type { BusRef } from "./bus";
import type { ISODate, ISODateTime, TimeHM, Weekday } from "./common";
import type { ServiceClosure } from "./holiday";
import type { DriverRef } from "./user";

/** `scheduled` is presented to people as "Upcoming". */
export const TRIP_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const ACTIVE_TRIP_STATUSES = ["scheduled", "in_progress"] as const satisfies readonly TripStatus[];

/** Trips run Monday to Saturday: every Sunday is a holiday. */
export const OPERATING_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const satisfies readonly Weekday[];

/** Where a trip starts and ends, as the admin typed them (e.g. "Shakthan Stand" → "SmartCity"). */
export interface RouteEndpoints {
  origin: string;
  destination: string;
}

/** One run of a bus on a date. Its route and running time are entered by the admin per trip. */
export interface Trip {
  id: string;
  busId: string;
  /** User id of the assigned driver. */
  driverId: string;
  /** The repeating schedule the trip was created by; null for a one-time trip. */
  seriesId: string | null;
  /** Free text, trimmed, 2–60 characters. */
  origin: string;
  /** Free text like `origin`, and never the same place (compared case-insensitively). */
  destination: string;
  /** Never a Sunday or a holiday. */
  date: ISODate;
  departureTime: TimeHM;
  /** Running time, entered as the arrival time (arrival − departure); the trip ends by midnight. */
  durationMinutes: number;
  status: TripStatus;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  cancellationReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * A repeating trip: when it was created, one `Trip` was added for every date in
 * [startDate, endDate] whose weekday is in `weekdays`, except holidays. Its trips are then edited
 * or cancelled one by one (or "this and later"); the series keeps the values it was created with.
 */
export interface TripSeries {
  id: string;
  busId: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: TimeHM;
  durationMinutes: number;
  /** Non-empty, sorted subset of `OPERATING_WEEKDAYS`. */
  weekdays: Weekday[];
  /** The first date asked for (inclusive). */
  startDate: ISODate;
  /** Inclusive; at most 90 days after `startDate`. */
  endDate: ISODate;
  createdAt: ISODateTime;
}

/** A trip's series, as shown on the trip ("Repeats Mon–Sat · 21 Sep – 12 Oct 2026"). */
export interface TripSeriesSummary extends Pick<TripSeries, "id" | "weekdays" | "startDate" | "endDate"> {
  /** Scheduled / in-progress trips of the series dated today or later. */
  upcomingTripCount: number;
  /**
   * What cancelling this trip with `scope: "series"` would cancel: this trip plus the series'
   * later scheduled trips (0 when this trip is not scheduled).
   */
  remainingTripCount: number;
}

/** `holiday` covers every day without service: Sundays as well as holidays. */
export const TRIP_UNBOOKABLE_REASONS = ["not_scheduled", "holiday", "departed", "full"] as const;
export type TripUnbookableReason = (typeof TRIP_UNBOOKABLE_REASONS)[number];

export type TripBookability =
  | { bookable: true }
  | { bookable: false; reason: TripUnbookableReason };

/** Denormalised trip row used by lists and embedded in bookings. */
export interface TripSummary {
  id: string;
  date: ISODate;
  departureTime: TimeHM;
  arrivalTime: TimeHM;
  durationMinutes: number;
  status: TripStatus;
  /** The trip's own origin and destination. */
  route: RouteEndpoints;
  /** Set when the trip belongs to a repeating series (show a "Repeats" badge). */
  seriesId: string | null;
  bus: BusRef;
  driver: DriverRef;
  capacity: number;
  /** Non-cancelled bookings (confirmed + completed). */
  bookedSeats: number;
  availableSeats: number;
}

export interface TripSearchItem extends TripSummary {
  bookability: TripBookability;
}

export interface TripSearchResult {
  date: ISODate;
  /** Set when there is no service on `date` (a Sunday or a holiday) — `trips` is then empty. */
  closure: ServiceClosure | null;
  /**
   * Every non-cancelled trip on `date` (all buses), by departure time then bus name. Departed /
   * full trips are included — read `bookability`.
   */
  trips: TripSearchItem[];
}

export const TRIP_EDITABLE_FIELDS = [
  "date",
  "departureTime",
  "durationMinutes",
  "origin",
  "destination",
  "busId",
  "driverId",
] as const;
export type TripEditableField = (typeof TRIP_EDITABLE_FIELDS)[number];

/** What the calling user may do with the trip right now (computed by the service). */
export interface TripPermissions {
  canEdit: boolean;
  canCancel: boolean;
  canStart: boolean;
  canComplete: boolean;
  /** Fields that cannot change because the trip already has bookings: date, origin, destination. */
  lockedFields: TripEditableField[];
}

export interface TripDetails extends TripSearchItem {
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  cancellationReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  permissions: TripPermissions;
  /** The repeating series the trip belongs to, or null for a one-time trip. */
  series: TripSeriesSummary | null;
}

export interface TripPassenger {
  bookingId: string;
  name: string;
  mobile: string;
  /** The booking's free-text pickup point. */
  pickupPoint: string;
  /** The booking's free-text drop point. */
  dropPoint: string;
  status: BookingStatus;
}

export interface TripWithPassengers extends TripDetails {
  /** Non-cancelled bookings, sorted by passenger name. */
  passengers: TripPassenger[];
}

/** Customers pick a bus trip by date; where they board and get off is typed on the booking. */
export interface TripSearchQuery {
  date: ISODate;
}

export interface TripListQuery {
  /** Inclusive. */
  dateFrom?: ISODate;
  /** Inclusive. */
  dateTo?: ISODate;
  busId?: string;
  driverId?: string;
  status?: TripStatus;
}

export interface MyTripsQuery {
  /** Inclusive; defaults to today. */
  dateFrom?: ISODate;
  /** Inclusive; defaults to `dateFrom`. */
  dateTo?: ISODate;
}

/** Makes a trip repeat: one trip on every date up to `until` whose weekday is in `weekdays`. */
export interface TripRepeatInput {
  /** Non-empty subset of `OPERATING_WEEKDAYS` (Sunday is never allowed); order does not matter. */
  weekdays: Weekday[];
  /** Inclusive; from the trip's `date` up to 90 days after it. */
  until: ISODate;
}

export interface CreateTripInput {
  /** The trip's date — with `repeat`, the first date of the series. */
  date: ISODate;
  departureTime: TimeHM;
  /** 15–600 minutes, ending by midnight. */
  durationMinutes: number;
  origin: string;
  destination: string;
  busId: string;
  driverId: string;
  /** Omit for a one-time trip. */
  repeat?: TripRepeatInput;
}

/** The dates part of a create request — what `previewSchedule` needs (a full input also fits). */
export type TripScheduleInput = Pick<CreateTripInput, "date" | "repeat">;

/** Always one trip: a series trip is edited on its own and stays in its series. */
export type UpdateTripInput = Partial<Omit<CreateTripInput, "repeat">>;

/** A date the schedule leaves out because there is no service that day. */
export interface SkippedTripDate {
  date: ISODate;
  reason: ServiceClosure["reason"];
  /** The holiday's name, when `reason` is `holiday`. */
  holidayReason?: string;
}

export interface TripSchedulePreview {
  /** The dates that would get a trip, in order. */
  dates: ISODate[];
  skipped: SkippedTripDate[];
}

export interface CreateTripResult {
  /** The created trips, by date (one for a one-time trip). */
  trips: TripSummary[];
  /** The new series when the input had `repeat`, else null. */
  series: TripSeries | null;
  /** Holidays in the repeat range that got no trip. */
  skipped: SkippedTripDate[];
}

/** One clash reported by CONFLICT(SCHEDULE_CONFLICT) in `details.conflicts`. */
export interface ScheduleConflict {
  date: ISODate;
  /** Which of the requested bus / driver is already on `trip` then. */
  busy: "bus" | "driver";
  trip: TripSummary;
}

/** `trip` (default) cancels only this trip; `series` also cancels the series' later scheduled trips. */
export const TRIP_CANCEL_SCOPES = ["trip", "series"] as const;
export type TripCancelScope = (typeof TRIP_CANCEL_SCOPES)[number];

export interface CancelTripInput {
  reason?: string;
  scope?: TripCancelScope;
}

export interface CancelTripResult {
  /** The trip the cancellation was requested for. */
  trip: TripDetails;
  /** Trips cancelled, this one included. */
  cancelledTrips: number;
  /** Confirmed bookings cancelled across those trips. */
  cancelledBookings: number;
}
