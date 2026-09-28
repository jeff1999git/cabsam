/** Joins raw records into the view models the services return. */
import "client-only";

import type {
  Booking,
  BookingDetails,
  Bus,
  BusWithUsage,
  Driver,
  DriverWithUsage,
  Holiday,
  ISODate,
  Route,
  RouteWithUsage,
  SessionUser,
  Trip,
  TripDetails,
  TripSearchItem,
  TripSummary,
  TripWithPassengers,
  User,
} from "@excelcabs/types";

import { addMinutes, type IstNow } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";

import {
  bookedSeatsByTrip,
  bookingCancelBlocker,
  tripBookability,
  tripPermissions,
  upcomingTrips,
} from "./_rules";

/** Lookup maps built once per service call. Rebuild after mutating a draft. */
export interface DbIndex {
  db: Readonly<MockDb>;
  routes: ReadonlyMap<string, Route>;
  buses: ReadonlyMap<string, Bus>;
  users: ReadonlyMap<string, User>;
  trips: ReadonlyMap<string, Trip>;
  holidays: ReadonlyMap<ISODate, Holiday>;
  /** Non-cancelled bookings per trip. */
  bookedSeats: ReadonlyMap<string, number>;
}

export function indexDb(db: Readonly<MockDb>): DbIndex {
  return {
    db,
    routes: new Map(db.routes.map((route) => [route.id, route])),
    buses: new Map(db.buses.map((bus) => [bus.id, bus])),
    users: new Map(db.users.map((user) => [user.id, user])),
    trips: new Map(db.trips.map((trip) => [trip.id, trip])),
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
  const route = must(index.routes.get(trip.routeId), `route ${trip.routeId}`);
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
    route: { id: route.id, origin: route.origin, destination: route.destination },
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
      holiday: index.holidays.get(trip.date),
      availableSeats: summary.availableSeats,
      now,
    }),
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

/** Upcoming-trip usage of buses, drivers and routes, computed once per call. */
interface UsageIndex {
  db: Readonly<MockDb>;
  upcoming: readonly Trip[];
  bookedSeats: ReadonlyMap<string, number>;
}

export function usageIndex(db: Readonly<MockDb>, today: ISODate): UsageIndex {
  return { db, upcoming: upcomingTrips(db, today), bookedSeats: bookedSeatsByTrip(db.bookings) };
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

export function toRouteWithUsage(usage: UsageIndex, route: Route): RouteWithUsage {
  return {
    ...route,
    upcomingTripCount: usage.upcoming.filter((trip) => trip.routeId === route.id).length,
    totalTripCount: usage.db.trips.filter((trip) => trip.routeId === route.id).length,
  };
}
