/** Joins raw records into the view models the services return. */
import "client-only";

import type {
  Booking,
  BookingDetails,
  Bus,
  BusWithUsage,
  Customer,
  CustomerWithStats,
  Driver,
  DriverWithUsage,
  Holiday,
  ISODate,
  ISODateTime,
  SessionUser,
  Trip,
  TripDetails,
  TripSearchItem,
  TripSeries,
  TripSeriesSummary,
  TripSummary,
  TripWithPassengers,
  User,
} from "@excelcabs/types";

import { addMinutes, type IstNow } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";

import {
  bookedSeatsByTrip,
  bookingCancelBlocker,
  closureOf,
  seriesCancelTargets,
  tripBookability,
  tripPermissions,
  upcomingTrips,
} from "./_rules";

/** Lookup maps built once per service call. Rebuild after mutating a draft. */
export interface DbIndex {
  db: Readonly<MockDb>;
  buses: ReadonlyMap<string, Bus>;
  users: ReadonlyMap<string, User>;
  trips: ReadonlyMap<string, Trip>;
  series: ReadonlyMap<string, TripSeries>;
  holidays: ReadonlyMap<ISODate, Holiday>;
  /** Non-cancelled bookings per trip. */
  bookedSeats: ReadonlyMap<string, number>;
}

export function indexDb(db: Readonly<MockDb>): DbIndex {
  return {
    db,
    buses: new Map(db.buses.map((bus) => [bus.id, bus])),
    users: new Map(db.users.map((user) => [user.id, user])),
    trips: new Map(db.trips.map((trip) => [trip.id, trip])),
    series: new Map(db.series.map((series) => [series.id, series])),
    holidays: new Map(db.holidays.map((holiday) => [holiday.date, holiday])),
    bookedSeats: bookedSeatsByTrip(db.bookings),
  };
}

function must<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`[mock] dangling reference: ${description}`);
  return value;
}

export function toSessionUser({ id, role, name, email, mobile }: User): SessionUser {
  return { id, role, name, email, mobile };
}

export function toTripSummary(index: DbIndex, trip: Trip): TripSummary {
  const bus = must(index.buses.get(trip.busId), `bus ${trip.busId}`);
  const driver = must(index.users.get(trip.driverId), `driver ${trip.driverId}`);
  const bookedSeats = index.bookedSeats.get(trip.id) ?? 0;
  return {
    id: trip.id,
    date: trip.date,
    departureTime: trip.departureTime,
    arrivalTime: addMinutes(trip.departureTime, trip.durationMinutes).time,
    durationMinutes: trip.durationMinutes,
    status: trip.status,
    route: { origin: trip.origin, destination: trip.destination },
    seriesId: trip.seriesId,
    bus: { id: bus.id, name: bus.name, registrationNumber: bus.registrationNumber, capacity: bus.capacity },
    driver: { id: driver.id, name: driver.name, mobile: driver.mobile },
    capacity: bus.capacity,
    bookedSeats,
    availableSeats: Math.max(0, bus.capacity - bookedSeats),
  };
}

export function toTripSearchItem(index: DbIndex, trip: Trip, now: IstNow): TripSearchItem {
  const summary = toTripSummary(index, trip);
  return {
    ...summary,
    bookability: tripBookability(trip, {
      closure: closureOf(trip.date, index.holidays.get(trip.date)),
      availableSeats: summary.availableSeats,
      now,
    }),
  };
}

function toTripSeriesSummary(index: DbIndex, trip: Trip, today: ISODate): TripSeriesSummary | null {
  const series = trip.seriesId === null ? undefined : index.series.get(trip.seriesId);
  if (!series) return null;
  return {
    id: series.id,
    weekdays: series.weekdays,
    startDate: series.startDate,
    endDate: series.endDate,
    upcomingTripCount: upcomingTrips(index.db, today).filter((other) => other.seriesId === series.id).length,
    remainingTripCount: seriesCancelTargets(index.db, trip).length,
  };
}

export function toTripDetails(
  index: DbIndex,
  trip: Trip,
  viewer: User | null,
  now: IstNow,
): TripDetails {
  const item = toTripSearchItem(index, trip, now);
  return {
    ...item,
    startedAt: trip.startedAt,
    completedAt: trip.completedAt,
    cancelledAt: trip.cancelledAt,
    cancellationReason: trip.cancellationReason,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
    permissions: tripPermissions(index.db, trip, viewer, item.bookedSeats, now),
    series: toTripSeriesSummary(index, trip, now.date),
  };
}

export function toTripWithPassengers(
  index: DbIndex,
  trip: Trip,
  viewer: User,
  now: IstNow,
): TripWithPassengers {
  const passengers = index.db.bookings
    .filter((booking) => booking.tripId === trip.id && booking.status !== "cancelled")
    .map((booking) => ({
      bookingId: booking.id,
      name: booking.passengerName,
      mobile: booking.passengerMobile,
      pickupPoint: booking.pickupPoint,
      dropPoint: booking.dropPoint,
      status: booking.status,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
  return { ...toTripDetails(index, trip, viewer, now), passengers };
}

export function toBookingDetails(
  index: DbIndex,
  booking: Booking,
  viewer: User,
  now: IstNow,
): BookingDetails {
  const trip = must(index.trips.get(booking.tripId), `trip ${booking.tripId}`);
  const bookedBy = must(index.users.get(booking.customerId), `customer ${booking.customerId}`);
  return {
    ...booking,
    trip: toTripSummary(index, trip),
    bookedBy: { id: bookedBy.id, name: bookedBy.name, email: bookedBy.email },
    canCancel: bookingCancelBlocker(viewer, booking, trip, now) === null,
  };
}

/** Trip usage of buses and drivers, computed once per call. */
interface UsageIndex {
  upcoming: readonly Trip[];
  bookedSeats: ReadonlyMap<string, number>;
}

export function usageIndex(db: Readonly<MockDb>, today: ISODate): UsageIndex {
  return { upcoming: upcomingTrips(db, today), bookedSeats: bookedSeatsByTrip(db.bookings) };
}

export function toBusWithUsage(usage: UsageIndex, bus: Bus): BusWithUsage {
  const trips = usage.upcoming.filter((trip) => trip.busId === bus.id);
  return {
    ...bus,
    upcomingTripCount: trips.length,
    maxBookedOnUpcomingTrip: Math.max(0, ...trips.map((trip) => usage.bookedSeats.get(trip.id) ?? 0)),
  };
}

export function toDriverWithUsage(usage: UsageIndex, driver: Driver): DriverWithUsage {
  return {
    ...driver,
    upcomingTripCount: usage.upcoming.filter((trip) => trip.driverId === driver.id).length,
  };
}

type CustomerStats = Pick<CustomerWithStats, "totalBookings" | "upcomingBookings" | "lastBookingAt">;

const NO_BOOKINGS: CustomerStats = { totalBookings: 0, upcomingBookings: 0, lastBookingAt: null };

/** Booking totals per customer id, computed once per call (accounts without bookings are absent). */
export function customerStatsIndex(
  db: Readonly<MockDb>,
  today: ISODate,
): ReadonlyMap<string, CustomerStats> {
  const upcomingTripIds = new Set(upcomingTrips(db, today).map((trip) => trip.id));
  const stats = new Map<string, CustomerStats>();
  for (const booking of db.bookings) {
    const entry = stats.get(booking.customerId) ?? { ...NO_BOOKINGS };
    entry.totalBookings += 1;
    if (booking.status === "confirmed" && upcomingTripIds.has(booking.tripId)) entry.upcomingBookings += 1;
    entry.lastBookingAt = latest(entry.lastBookingAt, booking.createdAt);
    stats.set(booking.customerId, entry);
  }
  return stats;
}

function latest(a: ISODateTime | null, b: ISODateTime): ISODateTime {
  return a === null || b > a ? b : a;
}

export function toCustomerWithStats(
  stats: ReadonlyMap<string, CustomerStats>,
  customer: Customer,
): CustomerWithStats {
  return { ...customer, ...(stats.get(customer.id) ?? NO_BOOKINGS) };
}
