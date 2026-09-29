import "client-only";

import {
  type Booking,
  type Bus,
  type FieldErrors,
  type ISODate,
  type ScheduleConflict,
  type ServiceErrorReason,
  type TimeHM,
  type Trip,
  TRIP_EDITABLE_FIELDS,
  type TripSeries,
  type TripSummary,
  type UpdateTripInput,
} from "@excelcabs/types";
import { z } from "zod";

import { TURNAROUND_MINUTES } from "@/config/business";
import {
  addMinutes,
  dayOfWeek,
  formatDateRange,
  formatDayMonth,
  formatTime,
  formatWeekdays,
  type IstNow,
  nowIso,
  nowIst,
} from "@/lib/datetime";
import { formatRoute, pluralize } from "@/lib/format";
import type { MockDb } from "@/lib/mock/db";
import { isoDateField, isSameStop } from "@/lib/schemas/common";
import { tripSearchInputSchema } from "@/lib/schemas/search";
import {
  cancelTripSchema,
  SUNDAY_NO_TRIPS_MESSAGE,
  tripInputSchema,
  tripScheduleInputSchema,
  tripUpdateSchema,
} from "@/lib/schemas/trip";

import { conflict, notFound, type ServiceError, validation } from "../errors";
import type { TripService } from "../trip.service";
import {
  type Cancellation,
  cancelTripWithBookings,
  closureOn,
  countBookedSeats,
  endsAfterMidnight,
  findScheduleConflicts,
  invalidTransition,
  lockedFieldsChanged,
  nextOperatingDay,
  scheduleDates,
  seriesCancelTargets,
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
const EMPTY_SCHEDULE_MESSAGE = "No trip dates in this range — pick more days or a later end date";
/** Dates named in a SCHEDULE_CONFLICT message before "and N more dates". */
const LISTED_CONFLICT_DATES = 3;

const nextOperatingDayQuerySchema = z.object({ from: isoDateField.optional() });

function byDeparture(a: Trip, b: Trip): number {
  return a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime);
}

/** Same-day order for customers: departure time, then bus name ("Bus 2" before "Bus 10"). */
function byTimeThenBus(a: TripSummary, b: TripSummary): number {
  return (
    a.departureTime.localeCompare(b.departureTime) ||
    a.bus.name.localeCompare(b.bus.name, "en", { numeric: true })
  );
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

function fieldError(field: string, message: string, reason?: ServiceErrorReason) {
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

function assertNotPastDate(date: ISODate, now: IstNow): void {
  if (date < now.date) throw fieldError("date", "Date cannot be in the past", "PAST_DATE");
}

function assertNotPast(date: ISODate, departureTime: TimeHM, now: IstNow): void {
  assertNotPastDate(date, now);
  if (date === now.date && departureTime <= now.time) {
    throw fieldError("departureTime", "This time has already passed", "PAST_DATE");
  }
}

/** Trips only run on operating days: never on a Sunday or a holiday. */
function assertOperatingDay(db: Readonly<MockDb>, date: ISODate): void {
  const closure = closureOn(db, date);
  if (closure?.reason === "sunday") throw fieldError("date", SUNDAY_NO_TRIPS_MESSAGE, "NON_OPERATING_DAY");
  if (closure?.reason === "holiday") {
    const message = `${formatDayMonth(date)} is a holiday (${closure.holiday.reason})`;
    throw fieldError("date", message, "TRIP_ON_HOLIDAY");
  }
}

/** A series trip may move to another date only if its series runs on that date. */
function assertWithinSeries(db: Readonly<MockDb>, trip: Trip): void {
  const series = db.series.find((candidate) => candidate.id === trip.seriesId);
  if (!series) return;
  const fits =
    trip.date >= series.startDate &&
    trip.date <= series.endDate &&
    series.weekdays.includes(dayOfWeek(trip.date));
  if (fits) return;
  const runs = `${formatWeekdays(series.weekdays)}, ${formatDateRange(series.startDate, series.endDate)}`;
  throw fieldError("date", `This trip is part of a series (${runs}) — pick a date within it`);
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

/** '6 Oct, 7 Oct, 8 Oct and 2 more dates' */
function describeDates(dates: readonly ISODate[]): string {
  const listed = dates.slice(0, LISTED_CONFLICT_DATES).map(formatDayMonth).join(", ");
  const more = dates.length - LISTED_CONFLICT_DATES;
  return more > 0 ? `${listed} and ${pluralize(more, "more date")}` : listed;
}

function scheduleConflict(conflicts: readonly ScheduleConflict[]): ServiceError {
  const busClashes = conflicts.filter((clash) => clash.busy === "bus");
  const driverClashes = conflicts.filter((clash) => clash.busy === "driver");
  const fieldErrors: FieldErrors = {};
  if (busClashes[0]) {
    fieldErrors.busId = `${busClashes[0].trip.bus.name} is busy on ${describeDates(busClashes.map((clash) => clash.date))}`;
  }
  if (driverClashes[0]) {
    fieldErrors.driverId = `${driverClashes[0].trip.driver.name} is busy on ${describeDates(driverClashes.map((clash) => clash.date))}`;
  }
  const message = fieldErrors.busId ?? fieldErrors.driverId ?? "Schedule conflict";
  return conflict("SCHEDULE_CONFLICT", message, { fieldErrors, details: { conflicts } });
}

/**
 * Adds a series' trips to the draft one by one, checking each against everything already there
 * (earlier trips of the same series included). Any clash throws SCHEDULE_CONFLICT listing all of
 * them, which discards the draft: nothing is written.
 */
function addSeriesTrips(draft: MockDb, trips: readonly Trip[]): void {
  const index = indexDb(draft);
  const conflicts: ScheduleConflict[] = [];
  for (const trip of trips) {
    const clashes = findScheduleConflicts(draft, trip);
    if (clashes.bus) conflicts.push({ date: trip.date, busy: "bus", trip: toTripSummary(index, clashes.bus) });
    if (clashes.driver) {
      conflicts.push({ date: trip.date, busy: "driver", trip: toTripSummary(index, clashes.driver) });
    }
    draft.trips.push(trip);
  }
  if (conflicts.length > 0) throw scheduleConflict(conflicts);
}

/** `trip` with the patch's fields; fields the patch leaves undefined keep their value. */
function applyChanges(trip: Trip, changes: UpdateTripInput): Trip {
  return {
    ...trip,
    date: changes.date ?? trip.date,
    departureTime: changes.departureTime ?? trip.departureTime,
    durationMinutes: changes.durationMinutes ?? trip.durationMinutes,
    origin: changes.origin ?? trip.origin,
    destination: changes.destination ?? trip.destination,
    busId: changes.busId ?? trip.busId,
    driverId: changes.driverId ?? trip.driverId,
  };
}

export const mockTripService: TripService = {
  search(query) {
    return mockRead((db) => {
      const { date } = parseInput(tripSearchInputSchema, query);
      const now = nowIst();
      assertNotPastDate(date, now);

      const closure = closureOn(db, date);
      if (closure) return { date, closure, trips: [] };
      const index = indexDb(db);
      const trips = db.trips
        .filter((trip) => trip.date === date && trip.status !== "cancelled")
        .map((trip) => toTripSearchItem(index, trip, now))
        .toSorted(byTimeThenBus);
      return { date, closure: null, trips };
    });
  },

  nextOperatingDay(from) {
    return mockRead((db) => {
      const query = parseInput(nextOperatingDayQuerySchema, { from });
      const today = nowIst().date;
      return nextOperatingDay(db, query.from && query.from > today ? query.from : today);
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

  previewSchedule(input) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return scheduleDates(db, parseInput(tripScheduleInputSchema, input));
    });
  },

  create(input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const { repeat, ...values } = parseInput(tripInputSchema, input);
      const now = nowIst();
      assertNotPastDate(values.date, now);
      if (!repeat) assertOperatingDay(draft, values.date);
      activeBus(draft, values.busId);
      assertActiveDriver(draft, values.driverId);
      assertEndsSameDay(values.departureTime, values.durationMinutes);

      const { dates, skipped } = scheduleDates(draft, { date: values.date, repeat });
      const [firstDate] = dates;
      if (firstDate === undefined) throw fieldError("until", EMPTY_SCHEDULE_MESSAGE, "EMPTY_SCHEDULE");
      assertNotPast(firstDate, values.departureTime, now);

      const at = nowIso();
      const { date: startDate, ...slot } = values;
      const newTrip = (date: ISODate, seriesId: string | null): Trip => ({
        id: newId("trp"),
        ...slot,
        date,
        seriesId,
        status: "scheduled",
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: at,
        updatedAt: at,
      });

      if (!repeat) {
        const trip = newTrip(firstDate, null);
        assertNoScheduleConflict(draft, trip);
        draft.trips.push(trip);
        return { trips: [toTripSummary(indexDb(draft), trip)], series: null, skipped };
      }
      const series: TripSeries = {
        id: newId("srs"),
        ...slot,
        weekdays: repeat.weekdays,
        startDate,
        endDate: repeat.until,
        createdAt: at,
      };
      const trips = dates.map((date) => newTrip(date, series.id));
      addSeriesTrips(draft, trips);
      draft.series.push(series);
      const index = indexDb(draft);
      return { trips: trips.map((trip) => toTripSummary(index, trip)), series, skipped };
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

      const next = applyChanges(trip, changes);
      const changed = TRIP_EDITABLE_FIELDS.filter((field) => next[field] !== trip[field]);
      if (changed.length === 0) return toTripDetails(indexDb(draft), trip, admin, now);

      const bookedSeats = countBookedSeats(draft.bookings, trip.id);
      const locked = lockedFieldsChanged(changed, bookedSeats);
      if (locked.length > 0) {
        throw conflict(
          "TRIP_LOCKED_FIELDS",
          `This trip has ${pluralize(bookedSeats, "booking")}, so its date and route can't change. Cancel it and create a new trip instead.`,
          { fieldErrors: Object.fromEntries(locked.map((field) => [field, "Locked — this trip has bookings"])) },
        );
      }

      const has = (field: (typeof changed)[number]) => changed.includes(field);
      if (isSameStop(next.origin, next.destination)) {
        throw fieldError("destination", "Destination must differ from the origin");
      }
      if (has("date") || has("departureTime")) assertNotPast(next.date, next.departureTime, now);
      if (has("date")) {
        assertOperatingDay(draft, next.date);
        assertWithinSeries(draft, next);
      }
      if (has("busId")) {
        const bus = activeBus(draft, next.busId);
        if (bus.capacity < bookedSeats) {
          const message = `${bus.name} has ${bus.capacity} seats but this trip has ${pluralize(bookedSeats, "booking")}`;
          throw conflict("CAPACITY_BELOW_BOOKINGS", message, { fieldErrors: { busId: message } });
        }
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
      const { reason, scope = "trip" } = parseInput(cancelTripSchema, input);
      const trip = findTrip(draft, id);
      if (trip.status !== "scheduled") {
        const violation = invalidTransition(trip);
        throw conflict(violation.reason, violation.message);
      }
      const targets = scope === "series" ? seriesCancelTargets(draft, trip) : [trip];
      const cancellation: Cancellation<"trip_cancelled"> = {
        reason: reason || TRIP_CANCELLED_REASON,
        source: "trip_cancelled",
        at: nowIso(),
      };
      let cancelledBookings = 0;
      for (const target of targets) cancelledBookings += cancelTripWithBookings(draft, target, cancellation);
      return {
        trip: toTripDetails(indexDb(draft), trip, admin, nowIst()),
        cancelledTrips: targets.length,
        cancelledBookings,
      };
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
