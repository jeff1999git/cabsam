import { ACTIVE_TRIP_STATUSES, OPERATING_WEEKDAYS, type Trip, type TripSeries } from "@excelcabs/types";

import { TURNAROUND_MINUTES } from "@/config/business";
import { dayOfWeek, toMinutes } from "@/lib/datetime";
import { isSameStop } from "@/lib/schemas/common";

import { BOOKING_ID_RE, bookingIdPrefix } from "./bookings";
import type { MockDb } from "./db";

const MINUTES_PER_DAY = 1_440;

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}

function isActive(trip: Trip): boolean {
  return (ACTIVE_TRIP_STATUSES as readonly string[]).includes(trip.status);
}

/** Non-empty, sorted, without duplicates and Mon–Sat only. */
function hasValidWeekdays({ weekdays }: TripSeries): boolean {
  const operating: readonly number[] = OPERATING_WEEKDAYS;
  const normalized = [...new Set(weekdays)].toSorted((a, b) => a - b);
  return (
    weekdays.length > 0 &&
    normalized.join() === weekdays.join() &&
    weekdays.every((day) => operating.includes(day))
  );
}

function overlaps(a: Trip, b: Trip): boolean {
  const start = (trip: Trip) => toMinutes(trip.departureTime);
  const end = (trip: Trip) => start(trip) + trip.durationMinutes + TURNAROUND_MINUTES;
  return start(a) < end(b) && start(b) < end(a);
}

/** Every broken invariant, as a readable message (empty when the data is consistent). */
function findDbViolations(db: Readonly<MockDb>): string[] {
  const violations: string[] = [];
  const users = new Map(db.users.map((user) => [user.id, user]));
  const buses = new Map(db.buses.map((bus) => [bus.id, bus]));
  const trips = new Map(db.trips.map((trip) => [trip.id, trip]));
  const series = new Map(db.series.map((item) => [item.id, item]));
  const holidayDates = new Set(db.holidays.map((holiday) => holiday.date));
  const credentialUsers = new Set(db.credentials.map((credential) => credential.userId));

  const collections = {
    users: db.users,
    buses: db.buses,
    series: db.series,
    trips: db.trips,
    bookings: db.bookings,
    holidays: db.holidays,
  };
  for (const [name, items] of Object.entries(collections)) {
    for (const id of duplicates(items.map((item) => item.id))) violations.push(`${name}: duplicate id ${id}`);
  }
  for (const email of duplicates(db.users.map((user) => user.email.toLowerCase()))) {
    violations.push(`users: duplicate email ${email}`);
  }
  for (const name of duplicates(db.buses.map((bus) => bus.name.toLowerCase()))) {
    violations.push(`buses: duplicate name ${name}`);
  }
  for (const registration of duplicates(db.buses.map((bus) => bus.registrationNumber))) {
    violations.push(`buses: duplicate registration ${registration}`);
  }
  for (const date of duplicates(db.holidays.map((holiday) => holiday.date))) {
    violations.push(`holidays: duplicate date ${date}`);
  }
  for (const user of db.users) {
    if (!credentialUsers.has(user.id)) violations.push(`users: ${user.id} has no credential`);
  }

  for (const item of db.series) {
    if (!buses.has(item.busId)) violations.push(`series ${item.id}: unknown bus ${item.busId}`);
    if (users.get(item.driverId)?.role !== "driver") {
      violations.push(`series ${item.id}: ${item.driverId} is not a driver`);
    }
    if (isSameStop(item.origin, item.destination)) violations.push(`series ${item.id}: origin equals destination`);
    if (item.durationMinutes <= 0) violations.push(`series ${item.id}: duration is not positive`);
    if (!hasValidWeekdays(item)) violations.push(`series ${item.id}: weekdays are not a sorted Mon–Sat set`);
    if (item.endDate < item.startDate) violations.push(`series ${item.id}: ends before it starts`);
  }

  for (const trip of db.trips) {
    const bus = buses.get(trip.busId);
    const driver = users.get(trip.driverId);
    if (!bus) violations.push(`trip ${trip.id}: unknown bus ${trip.busId}`);
    if (driver?.role !== "driver") violations.push(`trip ${trip.id}: ${trip.driverId} is not a driver`);
    if (isSameStop(trip.origin, trip.destination)) violations.push(`trip ${trip.id}: origin equals destination`);
    if (trip.durationMinutes <= 0) violations.push(`trip ${trip.id}: duration is not positive`);
    if (toMinutes(trip.departureTime) + trip.durationMinutes > MINUTES_PER_DAY) {
      violations.push(`trip ${trip.id}: ends after midnight`);
    }
    if (dayOfWeek(trip.date) === 0) violations.push(`trip ${trip.id}: runs on a Sunday`);
    // Adding a holiday cancels its scheduled trips; ones already completed that day stay.
    if (isActive(trip) && holidayDates.has(trip.date)) violations.push(`trip ${trip.id}: runs on a holiday`);
    if (isActive(trip) && trip.date >= db.seededOn && (bus?.status !== "active" || driver?.status !== "active")) {
      violations.push(`trip ${trip.id}: uses an inactive bus or driver`);
    }
    if (trip.seriesId !== null) {
      const owner = series.get(trip.seriesId);
      if (!owner) violations.push(`trip ${trip.id}: unknown series ${trip.seriesId}`);
      else if (
        trip.date < owner.startDate ||
        trip.date > owner.endDate ||
        !owner.weekdays.includes(dayOfWeek(trip.date))
      ) {
        violations.push(`trip ${trip.id}: ${trip.date} is outside series ${owner.id}`);
      }
    }
  }

  const running = db.trips.filter((trip) => trip.status !== "cancelled");
  for (const [date, sameDay] of groupBy(running, (trip) => trip.date)) {
    for (const [index, a] of sameDay.entries()) {
      for (const b of sameDay.slice(index + 1)) {
        if (!overlaps(a, b)) continue;
        if (a.busId === b.busId) violations.push(`${date}: bus ${a.busId} double-booked (${a.id}, ${b.id})`);
        if (a.driverId === b.driverId) violations.push(`${date}: driver ${a.driverId} double-booked (${a.id}, ${b.id})`);
      }
    }
  }

  for (const booking of db.bookings) {
    const trip = trips.get(booking.tripId);
    if (!trip) {
      violations.push(`booking ${booking.id}: unknown trip ${booking.tripId}`);
      continue;
    }
    const customer = users.get(booking.customerId);
    if (customer?.role !== "customer") {
      violations.push(`booking ${booking.id}: ${booking.customerId} is not a customer`);
    } else if (customer.status === "disabled" && booking.status === "confirmed") {
      violations.push(`booking ${booking.id}: confirmed for disabled customer ${customer.id}`);
    }
    if (!BOOKING_ID_RE.test(booking.id) || !booking.id.startsWith(bookingIdPrefix(trip.date))) {
      violations.push(`booking ${booking.id}: id does not match trip date ${trip.date}`);
    }
    if (!booking.pickupPoint.trim() || !booking.dropPoint.trim()) {
      violations.push(`booking ${booking.id}: missing pickup or drop point`);
    } else if (isSameStop(booking.pickupPoint, booking.dropPoint)) {
      violations.push(`booking ${booking.id}: pickup and drop are the same (${booking.pickupPoint})`);
    }
    const consistent =
      booking.status === "cancelled" ||
      (booking.status === "confirmed" && (trip.status === "scheduled" || trip.status === "in_progress")) ||
      (booking.status === "completed" && trip.status === "completed");
    if (!consistent) violations.push(`booking ${booking.id}: ${booking.status} on a ${trip.status} trip`);
  }

  const parsedIds = db.bookings.flatMap((booking) => {
    const match = BOOKING_ID_RE.exec(booking.id);
    return match?.[1] ? [{ ddmmyy: match[1], sequence: Number(match[2]) }] : [];
  });
  for (const [ddmmyy, ids] of groupBy(parsedIds, (id) => id.ddmmyy)) {
    const sequences = ids.map((id) => id.sequence).toSorted((a, b) => a - b);
    if (sequences.some((sequence, index) => sequence !== index + 1)) {
      violations.push(`bookings EXC-${ddmmyy}-…: sequence is not 1..${sequences.length}`);
    }
  }

  const seated = db.bookings.filter((booking) => booking.status !== "cancelled");
  for (const [tripId, tripBookings] of groupBy(seated, (booking) => booking.tripId)) {
    const trip = trips.get(tripId);
    const capacity = trip ? buses.get(trip.busId)?.capacity : undefined;
    if (capacity !== undefined && tripBookings.length > capacity) {
      violations.push(`trip ${tripId}: ${tripBookings.length} bookings exceed capacity ${capacity}`);
    }
    for (const mobile of duplicates(tripBookings.map((booking) => booking.passengerMobile))) {
      violations.push(`trip ${tripId}: passenger ${mobile} booked twice`);
    }
  }

  return violations;
}

/** Throws when the data breaks an invariant. Run after seeding in development and in tests. */
export function assertDbInvariants(db: Readonly<MockDb>): void {
  const violations = findDbViolations(db);
  if (violations.length > 0) {
    throw new Error(
      `[mock] ${violations.length} data invariant violation(s):\n${violations.slice(0, 20).join("\n")}`,
    );
  }
}
