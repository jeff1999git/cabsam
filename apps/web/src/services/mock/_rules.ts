/**
 * Business rules of the mock backend: pure functions over the database (or a write draft), so a
 * service call runs all its checks and changes inside one atomic `mockStore.write`. View-model
 * flags (`bookability`, `canCancel`, `permissions`) use the same predicates as the mutations, so
 * what the UI offers always matches what the service accepts.
 */
import "client-only";

import {
  ACTIVE_TRIP_STATUSES,
  type Booking,
  type CancellationSource,
  type Holiday,
  type ISODate,
  type ISODateTime,
  type ServiceClosure,
  type ServiceErrorReason,
  type SkippedTripDate,
  type TimeHM,
  type Trip,
  type TripBookability,
  type TripEditableField,
  type TripPermissions,
  type TripSchedulePreview,
  type TripScheduleInput,
  type User,
} from "@excelcabs/types";

import { BOOKING_CUTOFF_MINUTES, TURNAROUND_MINUTES } from "@/config/business";
import {
  addDays,
  dateTimeKey,
  dayOfWeek,
  diffDays,
  formatDayMonth,
  hasDeparted,
  type IstNow,
  toMinutes,
} from "@/lib/datetime";
import { bookingIdPrefix, formatBookingId } from "@/lib/mock/bookings";
import type { MockDb } from "@/lib/mock/db";

const MINUTES_PER_DAY = 1_440;

/** Fields that cannot change once a trip has bookings: passengers booked this date and route. */
const FIELDS_LOCKED_BY_BOOKINGS: readonly TripEditableField[] = ["date", "origin", "destination"];

export interface RuleViolation {
  reason: ServiceErrorReason;
  message: string;
}

// ── Service days ─────────────────────────────────────────────────────────────────────────────

export function holidayOn(db: Readonly<MockDb>, date: ISODate): Holiday | undefined {
  return db.holidays.find((holiday) => holiday.date === date);
}

/** Why there is no service on `date` given its holiday (if any): Sundays first, then holidays. */
export function closureOf(date: ISODate, holiday: Holiday | undefined): ServiceClosure | null {
  if (dayOfWeek(date) === 0) return { reason: "sunday" };
  return holiday ? { reason: "holiday", holiday } : null;
}

/** Why there is no service on `date`, or null on an operating day (Mon–Sat, not a holiday). */
export function closureOn(db: Readonly<MockDb>, date: ISODate): ServiceClosure | null {
  return closureOf(date, holidayOn(db, date));
}

/** 'No service on Sundays' · 'No service on 2 Oct — Gandhi Jayanti' */
export function closureMessage(closure: ServiceClosure): string {
  return closure.reason === "sunday"
    ? "No service on Sundays"
    : `No service on ${formatDayMonth(closure.holiday.date)} — ${closure.holiday.reason}`;
}

/** The first operating day on or after `from`. */
export function nextOperatingDay(db: Readonly<MockDb>, from: ISODate): ISODate {
  let date = from;
  while (closureOn(db, date)) date = addDays(date, 1);
  return date;
}

function toSkippedDate(date: ISODate, closure: ServiceClosure): SkippedTripDate {
  return closure.reason === "sunday"
    ? { date, reason: "sunday" }
    : { date, reason: "holiday", holidayReason: closure.holiday.reason };
}

/** Every date from `from` to `to`, both included. */
function datesBetween(from: ISODate, to: ISODate): ISODate[] {
  return Array.from({ length: diffDays(from, to) + 1 }, (_, offset) => addDays(from, offset));
}

/**
 * The dates a create request asks for, split into those that get a trip and those without
 * service. One-time: just `date`. Repeating: every date in [date, until] whose weekday is in
 * `weekdays` (which never includes Sunday, so only holidays are skipped).
 */
export function scheduleDates(db: Readonly<MockDb>, input: TripScheduleInput): TripSchedulePreview {
  const { date, repeat } = input;
  const requested = repeat
    ? datesBetween(date, repeat.until).filter((day) => repeat.weekdays.includes(dayOfWeek(day)))
    : [date];
  const preview: TripSchedulePreview = { dates: [], skipped: [] };
  for (const day of requested) {
    const closure = closureOn(db, day);
    if (closure) preview.skipped.push(toSkippedDate(day, closure));
    else preview.dates.push(day);
  }
  return preview;
}

// ── Trips ────────────────────────────────────────────────────────────────────────────────────

function isActiveTrip(trip: Trip): boolean {
  return (ACTIVE_TRIP_STATUSES as readonly string[]).includes(trip.status);
}

/** Scheduled or in progress, dated today or later — the trips that pin a bus or driver. */
function isUpcomingTrip(trip: Trip, today: ISODate): boolean {
  return isActiveTrip(trip) && trip.date >= today;
}

export function upcomingTrips(db: Readonly<MockDb>, today: ISODate): Trip[] {
  return db.trips.filter((trip) => isUpcomingTrip(trip, today));
}

/**
 * What cancelling `trip` with scope "series" cancels: the trip itself plus the scheduled trips of
 * its series that depart after it. Empty when the trip is not scheduled.
 */
export function seriesCancelTargets(db: Readonly<MockDb>, trip: Trip): Trip[] {
  if (trip.status !== "scheduled") return [];
  const departure = dateTimeKey(trip.date, trip.departureTime);
  const later = trip.seriesId
    ? db.trips.filter(
        (other) =>
          other.seriesId === trip.seriesId &&
          other.status === "scheduled" &&
          dateTimeKey(other.date, other.departureTime) > departure,
      )
    : [];
  return [trip, ...later];
}

export function endsAfterMidnight(departureTime: TimeHM, durationMinutes: number): boolean {
  return toMinutes(departureTime) + durationMinutes > MINUTES_PER_DAY;
}

/** Whether customers can still book or cancel (booking closes BOOKING_CUTOFF_MINUTES before). */
function isBookingClosed(trip: Trip, now: IstNow): boolean {
  return hasDeparted(trip.date, trip.departureTime, BOOKING_CUTOFF_MINUTES, now);
}

/** Checked in this order: status → no service that day (Sunday / holiday) → departure → seats. */
export function tripBookability(
  trip: Trip,
  context: { closure: ServiceClosure | null; availableSeats: number; now: IstNow },
): TripBookability {
  if (trip.status !== "scheduled") return { bookable: false, reason: "not_scheduled" };
  if (context.closure) return { bookable: false, reason: "holiday" };
  if (isBookingClosed(trip, context.now)) return { bookable: false, reason: "departed" };
  if (context.availableSeats <= 0) return { bookable: false, reason: "full" };
  return { bookable: true };
}

export interface TripSlot {
  date: ISODate;
  departureTime: TimeHM;
  durationMinutes: number;
  busId: string;
  driverId: string;
}

/** [departure, arrival + turnaround) in minutes since midnight. */
function slotMinutes(slot: Pick<TripSlot, "departureTime" | "durationMinutes">): [number, number] {
  const start = toMinutes(slot.departureTime);
  return [start, start + slot.durationMinutes + TURNAROUND_MINUTES];
}

/** Active trips on the same date that already occupy the slot's bus and/or driver. */
export function findScheduleConflicts(
  db: Readonly<MockDb>,
  slot: TripSlot,
  excludeTripId?: string,
): { bus?: Trip; driver?: Trip } {
  const [start, end] = slotMinutes(slot);
  const overlapping = db.trips.filter((trip) => {
    if (trip.id === excludeTripId || trip.date !== slot.date || !isActiveTrip(trip)) return false;
    const [otherStart, otherEnd] = slotMinutes(trip);
    return start < otherEnd && otherStart < end;
  });
  return {
    bus: overlapping.find((trip) => trip.busId === slot.busId),
    driver: overlapping.find((trip) => trip.driverId === slot.driverId),
  };
}

/** Why the driver cannot start the trip now, or null when they can. */
export function tripStartBlocker(
  db: Readonly<MockDb>,
  trip: Trip,
  now: IstNow,
): RuleViolation | null {
  if (trip.status !== "scheduled") return invalidTransition(trip);
  if (trip.date !== now.date) {
    return { reason: "TRIP_NOT_TODAY", message: "Trips can only be started on the day they run" };
  }
  const active = db.trips.find(
    (other) => other.id !== trip.id && other.driverId === trip.driverId && other.status === "in_progress",
  );
  if (active) {
    return {
      reason: "DRIVER_HAS_ACTIVE_TRIP",
      message: "Complete your trip in progress before starting another",
    };
  }
  return null;
}

export function invalidTransition(trip: Trip): RuleViolation {
  const messages: Record<Trip["status"], string> = {
    scheduled: "This trip hasn't started yet",
    in_progress: "This trip is already in progress",
    completed: "This trip is already completed",
    cancelled: "This trip was cancelled",
  };
  return { reason: "INVALID_TRANSITION", message: messages[trip.status] };
}

export function tripPermissions(
  db: Readonly<MockDb>,
  trip: Trip,
  viewer: User | null,
  bookedSeats: number,
  now: IstNow,
): TripPermissions {
  const permissions: TripPermissions = {
    canEdit: false,
    canCancel: false,
    canStart: false,
    canComplete: false,
    lockedFields: bookedSeats > 0 ? [...FIELDS_LOCKED_BY_BOOKINGS] : [],
  };
  if (viewer?.role === "admin") {
    permissions.canEdit = trip.status === "scheduled";
    permissions.canCancel = trip.status === "scheduled";
  } else if (viewer?.role === "driver" && viewer.id === trip.driverId) {
    permissions.canStart = tripStartBlocker(db, trip, now) === null;
    permissions.canComplete = trip.status === "in_progress";
  }
  return permissions;
}

export function lockedFieldsChanged(
  changed: readonly TripEditableField[],
  bookedSeats: number,
): TripEditableField[] {
  return bookedSeats > 0 ? changed.filter((field) => FIELDS_LOCKED_BY_BOOKINGS.includes(field)) : [];
}

export interface Cancellation<TSource extends CancellationSource = CancellationSource> {
  reason: string;
  source: TSource;
  at: ISODateTime;
}

/**
 * Cancels a scheduled trip and its confirmed bookings (in the draft). Returns how many bookings
 * were cancelled.
 */
export function cancelTripWithBookings(
  draft: MockDb,
  trip: Trip,
  cancellation: Cancellation<"trip_cancelled" | "holiday">,
): number {
  Object.assign(trip, {
    status: "cancelled",
    cancelledAt: cancellation.at,
    cancellationReason: cancellation.reason,
    updatedAt: cancellation.at,
  } satisfies Partial<Trip>);
  let cancelled = 0;
  for (const booking of draft.bookings) {
    if (booking.tripId !== trip.id || booking.status !== "confirmed") continue;
    cancelBooking(booking, cancellation);
    cancelled += 1;
  }
  return cancelled;
}

/**
 * Cancels a customer's confirmed bookings on scheduled / in-progress trips (in the draft) when
 * the admin disables the account. Returns how many bookings were cancelled.
 */
export function cancelCustomerBookings(
  draft: MockDb,
  customerId: string,
  cancellation: Cancellation<"admin">,
): number {
  const activeTripIds = new Set(draft.trips.filter(isActiveTrip).map((trip) => trip.id));
  let cancelled = 0;
  for (const booking of draft.bookings) {
    if (booking.customerId !== customerId || booking.status !== "confirmed") continue;
    if (!activeTripIds.has(booking.tripId)) continue;
    cancelBooking(booking, cancellation);
    cancelled += 1;
  }
  return cancelled;
}

// ── Bookings ─────────────────────────────────────────────────────────────────────────────────

/** Marks a booking cancelled (in the draft); the caller has already checked it may be. */
export function cancelBooking(booking: Booking, cancellation: Cancellation): void {
  Object.assign(booking, {
    status: "cancelled",
    cancelledAt: cancellation.at,
    cancellationSource: cancellation.source,
    cancellationReason: cancellation.reason,
    updatedAt: cancellation.at,
  } satisfies Partial<Booking>);
}

export function countBookedSeats(bookings: readonly Booking[], tripId: string): number {
  return bookings.filter((booking) => booking.tripId === tripId && booking.status !== "cancelled")
    .length;
}

export function bookedSeatsByTrip(bookings: readonly Booking[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.status !== "cancelled") counts.set(booking.tripId, (counts.get(booking.tripId) ?? 0) + 1);
  }
  return counts;
}

/** `EXC-DDMMYY-NNN`: trip date + (highest sequence for that date) + 1. Ids are never reused. */
export function nextBookingId(db: Readonly<MockDb>, tripDate: ISODate): string {
  const prefix = bookingIdPrefix(tripDate);
  let highest = 0;
  for (const booking of db.bookings) {
    if (booking.id.startsWith(prefix)) highest = Math.max(highest, Number(booking.id.slice(prefix.length)));
  }
  return formatBookingId(tripDate, highest + 1);
}

/**
 * Why `viewer` cannot cancel the booking now, or null when they can. Customers may cancel their
 * own confirmed bookings until departure; admins any confirmed booking on a scheduled or
 * in-progress trip; drivers never.
 */
export function bookingCancelBlocker(
  viewer: User,
  booking: Booking,
  trip: Trip,
  now: IstNow,
): RuleViolation | null {
  if (viewer.role === "driver") {
    return { reason: "BOOKING_NOT_CANCELLABLE", message: "Drivers can't cancel bookings" };
  }
  if (booking.status !== "confirmed") {
    return {
      reason: "BOOKING_NOT_CANCELLABLE",
      message: booking.status === "cancelled" ? "This booking is already cancelled" : "This trip is already completed",
    };
  }
  if (viewer.role === "admin") {
    return isActiveTrip(trip)
      ? null
      : { reason: "BOOKING_NOT_CANCELLABLE", message: "This booking can no longer be cancelled" };
  }
  if (trip.status !== "scheduled" || hasDeparted(trip.date, trip.departureTime, 0, now)) {
    return { reason: "CANCELLATION_CLOSED", message: "This trip has departed, so the booking can't be cancelled" };
  }
  return null;
}
