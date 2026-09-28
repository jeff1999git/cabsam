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
  type Bus,
  type CancellationSource,
  type Holiday,
  type ISODate,
  type RouteEndpoints,
  type ServiceErrorReason,
  type TimeHM,
  type Trip,
  type TripBookability,
  type TripDirection,
  type TripEditableField,
  type TripPermissions,
  type User,
} from "@excelcabs/types";

import { BOOKING_CUTOFF_MINUTES, TURNAROUND_MINUTES } from "@/config/business";
import { formatDayMonth, hasDeparted, type IstNow, toMinutes } from "@/lib/datetime";
import { bookingIdPrefix, formatBookingId } from "@/lib/mock/bookings";
import type { MockDb } from "@/lib/mock/db";
import { isSameStop } from "@/lib/schemas/common";

const MINUTES_PER_DAY = 1_440;

/** Fields that cannot change once a trip has bookings (a bus change must keep the same route). */
const FIELDS_LOCKED_BY_BOOKINGS: readonly TripEditableField[] = ["date", "direction"];

export interface RuleViolation {
  reason: ServiceErrorReason;
  message: string;
}

// ── Routes ───────────────────────────────────────────────────────────────────────────────────

/** The stops a trip runs between: outbound = the bus's origin → destination, return = the reverse. */
export function routeEndpoints(
  bus: Pick<Bus, "origin" | "destination">,
  direction: TripDirection,
): RouteEndpoints {
  return direction === "outbound"
    ? { origin: bus.origin, destination: bus.destination }
    : { origin: bus.destination, destination: bus.origin };
}

/** Same stops in the same order, compared case-insensitively. */
export function isSameRoute(a: RouteEndpoints, b: RouteEndpoints): boolean {
  return isSameStop(a.origin, b.origin) && isSameStop(a.destination, b.destination);
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

export function holidayOn(db: Readonly<MockDb>, date: ISODate): Holiday | undefined {
  return db.holidays.find((holiday) => holiday.date === date);
}

export function holidayMessage(holiday: Holiday): string {
  return `No service on ${formatDayMonth(holiday.date)} — ${holiday.reason}`;
}

export function endsAfterMidnight(departureTime: TimeHM, durationMinutes: number): boolean {
  return toMinutes(departureTime) + durationMinutes > MINUTES_PER_DAY;
}

/** Whether customers can still book or cancel (booking closes BOOKING_CUTOFF_MINUTES before). */
function isBookingClosed(trip: Trip, now: IstNow): boolean {
  return hasDeparted(trip.date, trip.departureTime, BOOKING_CUTOFF_MINUTES, now);
}

/** Checked in this order: status → holiday → departure → seats. */
export function tripBookability(
  trip: Trip,
  context: { holiday: Holiday | undefined; availableSeats: number; now: IstNow },
): TripBookability {
  if (trip.status !== "scheduled") return { bookable: false, reason: "not_scheduled" };
  if (context.holiday) return { bookable: false, reason: "holiday" };
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

/**
 * Cancels a scheduled trip and its confirmed bookings (in the draft). Returns how many bookings
 * were cancelled.
 */
export function cancelTripWithBookings(
  draft: MockDb,
  trip: Trip,
  cancellation: { reason: string; source: Extract<CancellationSource, "trip_cancelled" | "holiday">; at: string },
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
    Object.assign(booking, {
      status: "cancelled",
      cancelledAt: cancellation.at,
      cancellationSource: cancellation.source,
      cancellationReason: cancellation.reason,
      updatedAt: cancellation.at,
    } satisfies Partial<Booking>);
    cancelled += 1;
  }
  return cancelled;
}

// ── Bookings ─────────────────────────────────────────────────────────────────────────────────

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
