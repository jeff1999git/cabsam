import "client-only";

import {
  type Booking,
  type Bus,
  type FieldErrors,
  type ISODate,
  type RouteEndpoints,
  type ServiceErrorReason,
  type TimeHM,
  type Trip,
  TRIP_DIRECTIONS,
  TRIP_EDITABLE_FIELDS,
  type TripSummary,
} from "@excelcabs/types";

import { TURNAROUND_MINUTES } from "@/config/business";
import { addMinutes, formatDayMonth, formatTime, type IstNow, nowIso, nowIst } from "@/lib/datetime";
import { formatRoute, pluralize } from "@/lib/format";
import type { MockDb } from "@/lib/mock/db";
import { isSameStop } from "@/lib/schemas/common";
import { tripSearchInputSchema } from "@/lib/schemas/search";
import { cancelTripSchema, tripInputSchema, tripUpdateSchema } from "@/lib/schemas/trip";

import { conflict, notFound, validation } from "../errors";
import type { TripService } from "../trip.service";
import {
  cancelTripWithBookings,
  countBookedSeats,
  endsAfterMidnight,
  findScheduleConflicts,
  holidayOn,
  invalidTransition,
  isSameRoute,
  lockedFieldsChanged,
  routeEndpoints,
  type TripSlot,
  tripStartBlocker,
} from "./_rules";
import { requireUser } from "./_session";
import { mockRead, mockWrite, newId, parseInput } from "./_utils";
import {
  indexDb,
  toTripDetails,
  toTripSearchItem,
  toTripSummary,
  toTripWithPassengers,
} from "./_views";

const TRIP_CANCELLED_REASON = "Trip cancelled by operator";

function byDeparture(a: Trip, b: Trip): number {
  return a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime);
}

function byStops(a: RouteEndpoints, b: RouteEndpoints): number {
  return a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination);
}

function findTrip(db: Readonly<MockDb>, id: string): Trip {
  const trip = db.trips.find((candidate) => candidate.id === id);
  if (!trip) throw notFound("Trip");
  return trip;
}

/** A driver only ever sees their own trips; anyone else's is reported as not found. */
function findOwnTrip(db: Readonly<MockDb>, id: string, driverId: string): Trip {
  const trip = findTrip(db, id);
  if (trip.driverId !== driverId) throw notFound("Trip");
  return trip;
}

function fieldError(field: string, message: string, reason: ServiceErrorReason) {
  return validation({ [field]: message }, message, reason);
}

function activeBus(db: Readonly<MockDb>, id: string): Bus {
  const bus = db.buses.find((candidate) => candidate.id === id);
  if (bus?.status === "active") return bus;
  const message = bus ? `${bus.name} is not in service (${bus.status})` : "Select a bus";
  throw fieldError("busId", message, "RESOURCE_INACTIVE");
}

function assertActiveDriver(db: Readonly<MockDb>, id: string): void {
  const user = db.users.find((candidate) => candidate.id === id);
  if (user?.role === "driver" && user.status === "active") return;
  const message = user?.role === "driver" ? `${user.name} is disabled` : "Select a driver";
  throw fieldError("driverId", message, "RESOURCE_INACTIVE");
}

function assertNotPast(date: ISODate, departureTime: TimeHM, now: IstNow): void {
  if (date < now.date) throw fieldError("date", "Date cannot be in the past", "PAST_DATE");
  if (date === now.date && departureTime <= now.time) {
    throw fieldError("departureTime", "This time has already passed", "PAST_DATE");
  }
}

function assertNotHoliday(db: Readonly<MockDb>, date: ISODate): void {
  const holiday = holidayOn(db, date);
  if (holiday) {
    throw fieldError("date", `${formatDayMonth(date)} is a holiday (${holiday.reason})`, "TRIP_ON_HOLIDAY");
  }
}

function assertEndsSameDay(departureTime: TimeHM, durationMinutes: number): void {
  if (endsAfterMidnight(departureTime, durationMinutes)) {
    throw fieldError("departureTime", "This trip would end after midnight", "TRIP_ENDS_AFTER_MIDNIGHT");
  }
}

/** '7:00 AM Shakthan Stand → SmartCity (until 9:15 AM)' — the busy window includes turnaround. */
function describeBusyWindow(trip: TripSummary): string {
  const until = addMinutes(trip.departureTime, trip.durationMinutes + TURNAROUND_MINUTES).time;
  return `${formatTime(trip.departureTime)} ${formatRoute(trip.route)} (until ${formatTime(until)})`;
}

function assertNoScheduleConflict(db: Readonly<MockDb>, slot: TripSlot, excludeTripId?: string): void {
  const clashes = findScheduleConflicts(db, slot, excludeTripId);
  if (!clashes.bus && !clashes.driver) return;
  const index = indexDb(db);
  const fieldErrors: FieldErrors = {};
  let conflictingTrip: TripSummary | undefined;
  if (clashes.driver) {
    conflictingTrip = toTripSummary(index, clashes.driver);
    fieldErrors.driverId = `${conflictingTrip.driver.name} is driving the ${describeBusyWindow(conflictingTrip)}`;
  }
  if (clashes.bus) {
    conflictingTrip = toTripSummary(index, clashes.bus);
    fieldErrors.busId = `${conflictingTrip.bus.name} is on the ${describeBusyWindow(conflictingTrip)}`;
  }
  const message = fieldErrors.busId ?? fieldErrors.driverId ?? "Schedule conflict";
  throw conflict(clashes.bus ? "BUS_BUSY" : "DRIVER_BUSY", message, {
    fieldErrors,
    details: { conflictingTrip },
  });
}

export const mockTripService: TripService = {
  listRoutes() {
    return mockRead((db) => {
      const served = new Map<string, RouteEndpoints>();
      for (const bus of db.buses) {
        if (bus.status !== "active") continue;
        for (const direction of TRIP_DIRECTIONS) {
          const route = routeEndpoints(bus, direction);
          const key = `${route.origin.toLowerCase()}→${route.destination.toLowerCase()}`;
          if (!served.has(key)) served.set(key, route);
        }
      }
      return [...served.values()].toSorted(byStops);
    });
  },

  search(query) {
    return mockRead((db) => {
      const { date, from, to } = parseInput(tripSearchInputSchema, query);
      const now = nowIst();
      if (date < now.date) throw fieldError("date", "Date cannot be in the past", "PAST_DATE");
      if (isSameStop(from, to)) throw validation({ to: "Choose a different destination" });

      const holiday = holidayOn(db, date) ?? null;
      if (holiday) return { date, from, to, holiday, trips: [] };
      const index = indexDb(db);
      const trips = db.trips
        .filter((trip) => trip.date === date && trip.status !== "cancelled")
        .filter((trip) => {
          const bus = index.buses.get(trip.busId);
          return bus !== undefined && isSameRoute(routeEndpoints(bus, trip.direction), { origin: from, destination: to });
        })
        .toSorted(byDeparture)
        .map((trip) => toTripSearchItem(index, trip, now));
      return { date, from, to, holiday: null, trips };
    });
  },

  getForBooking(id) {
    return mockRead((db) => toTripSearchItem(indexDb(db), findTrip(db, id), nowIst()));
  },

  list(query = {}) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      const index = indexDb(db);
      return db.trips
        .filter(
          (trip) =>
            (!query.dateFrom || trip.date >= query.dateFrom) &&
            (!query.dateTo || trip.date <= query.dateTo) &&
            (!query.busId || trip.busId === query.busId) &&
            (!query.driverId || trip.driverId === query.driverId) &&
            (!query.status || trip.status === query.status),
        )
        .toSorted(byDeparture)
        .map((trip) => toTripSummary(index, trip));
    });
  },

  get(id) {
    return mockRead((db) => {
      const admin = requireUser(db, ["admin"]);
      return toTripDetails(indexDb(db), findTrip(db, id), admin, nowIst());
    });
  },

  getWithPassengers(id) {
    return mockRead((db) => {
      const viewer = requireUser(db, ["admin", "driver"]);
      const trip = viewer.role === "driver" ? findOwnTrip(db, id, viewer.id) : findTrip(db, id);
      return toTripWithPassengers(indexDb(db), trip, viewer, nowIst());
    });
  },

  listMine(query = {}) {
    return mockRead((db) => {
      const driver = requireUser(db, ["driver"]);
      const dateFrom = query.dateFrom ?? nowIst().date;
      const dateTo = query.dateTo ?? dateFrom;
      const index = indexDb(db);
      return db.trips
        .filter((trip) => trip.driverId === driver.id && trip.date >= dateFrom && trip.date <= dateTo)
        .toSorted(byDeparture)
        .map((trip) => toTripSummary(index, trip));
    });
  },

  create(input) {
    return mockWrite((draft) => {
      const admin = requireUser(draft, ["admin"]);
      const values = parseInput(tripInputSchema, input);
      const now = nowIst();
      assertNotPast(values.date, values.departureTime, now);
      assertNotHoliday(draft, values.date);
      const bus = activeBus(draft, values.busId);
      assertActiveDriver(draft, values.driverId);
      assertEndsSameDay(values.departureTime, bus.durationMinutes);
      assertNoScheduleConflict(draft, { ...values, durationMinutes: bus.durationMinutes });

      const at = nowIso();
      const trip: Trip = {
        id: newId("trp"),
        ...values,
        durationMinutes: bus.durationMinutes,
        status: "scheduled",
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: at,
        updatedAt: at,
      };
      draft.trips.push(trip);
      return toTripDetails(indexDb(draft), trip, admin, now);
    });
  },

  update(id, patch) {
    return mockWrite((draft) => {
      const admin = requireUser(draft, ["admin"]);
      const changes = parseInput(tripUpdateSchema, patch);
      const trip = findTrip(draft, id);
      const now = nowIst();
      if (trip.status !== "scheduled") {
        throw conflict("TRIP_NOT_EDITABLE", "Only upcoming trips can be edited");
      }

      const changed = TRIP_EDITABLE_FIELDS.filter(
        (field) => changes[field] !== undefined && changes[field] !== trip[field],
      );
      if (changed.length === 0) return toTripDetails(indexDb(draft), trip, admin, now);

      const bookedSeats = countBookedSeats(draft.bookings, trip.id);
      const locked = lockedFieldsChanged(changed, bookedSeats);
      if (locked.length > 0) {
        throw conflict(
          "TRIP_LOCKED_FIELDS",
          `This trip has ${pluralize(bookedSeats, "booking")}, so its date and direction can't change. Cancel it and create a new trip instead.`,
          { fieldErrors: Object.fromEntries(locked.map((field) => [field, "Locked — this trip has bookings"])) },
        );
      }

      const next: Trip = { ...trip, ...changes };
      const has = (field: (typeof changed)[number]) => changed.includes(field);
      if (has("date") || has("departureTime")) assertNotPast(next.date, next.departureTime, now);
      if (has("date")) assertNotHoliday(draft, next.date);
      if (has("busId")) {
        const bus = activeBus(draft, next.busId);
        const route = toTripSummary(indexDb(draft), trip).route;
        if (bookedSeats > 0 && !isSameRoute(route, routeEndpoints(bus, next.direction))) {
          const message = `${bus.name} serves ${bus.origin} ⇄ ${bus.destination}, but this trip has ${pluralize(bookedSeats, "booking")} for ${formatRoute(route)}`;
          throw conflict("TRIP_BUS_ROUTE_MISMATCH", message, { fieldErrors: { busId: message } });
        }
        if (bus.capacity < bookedSeats) {
          const message = `${bus.name} has ${bus.capacity} seats but this trip has ${pluralize(bookedSeats, "booking")}`;
          throw conflict("CAPACITY_BELOW_BOOKINGS", message, { fieldErrors: { busId: message } });
        }
        next.durationMinutes = bus.durationMinutes;
      }
      if (has("driverId")) assertActiveDriver(draft, next.driverId);
      assertEndsSameDay(next.departureTime, next.durationMinutes);
      assertNoScheduleConflict(draft, next, trip.id);

      Object.assign(trip, next, { updatedAt: nowIso() });
      return toTripDetails(indexDb(draft), trip, admin, now);
    });
  },

  cancel(id, input = {}) {
    return mockWrite((draft) => {
      const admin = requireUser(draft, ["admin"]);
      const { reason } = parseInput(cancelTripSchema, input);
      const trip = findTrip(draft, id);
      if (trip.status !== "scheduled") {
        const violation = invalidTransition(trip);
        throw conflict(violation.reason, violation.message);
      }
      const cancelledBookings = cancelTripWithBookings(draft, trip, {
        reason: reason || TRIP_CANCELLED_REASON,
        source: "trip_cancelled",
        at: nowIso(),
      });
      return { trip: toTripDetails(indexDb(draft), trip, admin, nowIst()), cancelledBookings };
    });
  },

  start(id) {
    return mockWrite((draft) => {
      const driver = requireUser(draft, ["driver"]);
      const trip = findOwnTrip(draft, id, driver.id);
      const now = nowIst();
      const blocker = tripStartBlocker(draft, trip, now);
      if (blocker) throw conflict(blocker.reason, blocker.message);
      const at = nowIso();
      Object.assign(trip, { status: "in_progress", startedAt: at, updatedAt: at } satisfies Partial<Trip>);
      return toTripDetails(indexDb(draft), trip, driver, now);
    });
  },

  complete(id) {
    return mockWrite((draft) => {
      const driver = requireUser(draft, ["driver"]);
      const trip = findOwnTrip(draft, id, driver.id);
      if (trip.status !== "in_progress") {
        const violation = invalidTransition(trip);
        throw conflict(violation.reason, violation.message);
      }
      const at = nowIso();
      Object.assign(trip, { status: "completed", completedAt: at, updatedAt: at } satisfies Partial<Trip>);
      for (const booking of draft.bookings) {
        if (booking.tripId === trip.id && booking.status === "confirmed") {
          Object.assign(booking, { status: "completed", completedAt: at, updatedAt: at } satisfies Partial<Booking>);
        }
      }
      return toTripDetails(indexDb(draft), trip, driver, nowIst());
    });
  },
};
