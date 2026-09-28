import type { Booking, Bus, Customer, ISODate, Trip } from "@excelcabs/types";

import { diffDays, formatDDMMYY, istToEpoch } from "@/lib/datetime";

import { rngFor, type Rng } from "./random";
import { nthOperatingDay, tripId } from "./trips";

export const BOOKING_ID_RE = /^EXC-(\d{6})-(\d{3,})$/;

export function bookingIdPrefix(tripDate: ISODate): string {
  return `EXC-${formatDDMMYY(tripDate)}-`;
}

/** `EXC-DDMMYY-NNN` from the trip date and its per-date sequence (grows past 999). */
export function formatBookingId(tripDate: ISODate, sequence: number): string {
  return `${bookingIdPrefix(tripDate)}${String(sequence).padStart(3, "0")}`;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const CUSTOMER_CANCEL_RATE = 0.06;
const TRIP_CANCELLED_REASON = "Trip cancelled by operator";

/** Share of seats taken, by calendar-day offset from today. */
function loadRange(dayOffset: number): readonly [number, number] {
  if (dayOffset < 0) return [0.55, 0.9];
  if (dayOffset === 0) return [0.45, 0.75];
  if (dayOffset === 1) return [0.35, 0.6];
  if (dayOffset <= 3) return [0.2, 0.45];
  if (dayOffset <= 7) return [0.1, 0.3];
  return [0, 0.15];
}

/** Arjun Nair's history: (operating-day offset, template, cancelled by him). */
const DEMO_CUSTOMER_TRIPS = [
  { opDay: -6, templateId: "t1", cancelled: false },
  { opDay: -4, templateId: "t5", cancelled: false },
  { opDay: -2, templateId: "t4", cancelled: true },
  { opDay: -1, templateId: "t1", cancelled: false },
  { opDay: 0, templateId: "t5", cancelled: false },
  { opDay: 1, templateId: "t1", cancelled: false },
  { opDay: 2, templateId: "t1", cancelled: true },
  { opDay: 3, templateId: "t4", cancelled: false },
] as const;

/** Today's 7:00 AM manifest: the fixed riders + 15 others = 18 of 40 seats, plus 2 cancellations. */
const TODAY_T1 = { templateId: "t1", others: 15, cancelled: 2 } as const;
/** The next operating day's 9:00 AM trip is sold out. */
const FULL_TRIP = { opDay: 1, templateId: "t4", cancelled: 1 } as const;

interface Seat {
  customer: Customer;
  cancelledByCustomer: boolean;
}

interface GenerateBookingsOptions {
  today: ISODate;
  seededAtMs: number;
  days: readonly ISODate[];
  trips: readonly Trip[];
  buses: readonly Bus[];
  /** Customers who fill trips at random. */
  pool: readonly Customer[];
  /** Always booked on today's 7:00 AM trip. */
  fixedPassengers: readonly Customer[];
  demoCustomer: Customer;
}

/** Stable per timetable slot and day offset, so every day's data looks the same. */
function rngForTrip(purpose: string, trip: Trip, dayOffset: number): Rng {
  return rngFor(purpose, trip.departureTime, trip.busId, trip.direction, dayOffset);
}

function seatsFor(customers: readonly Customer[], cancelledByCustomer: boolean): Seat[] {
  return customers.map((customer) => ({ customer, cancelledByCustomer }));
}

function randomSeats(rng: Rng, pool: readonly Customer[], count: number): Seat[] {
  return rng
    .shuffle(pool)
    .slice(0, count)
    .map((customer) => ({ customer, cancelledByCustomer: rng.chance(CUSTOMER_CANCEL_RATE) }));
}

/** Seated passengers for one trip, drawn without replacement (no duplicate mobiles). */
function manifestFor(
  trip: Trip,
  capacity: number,
  options: GenerateBookingsOptions,
  demoSeat: Seat | undefined,
): Seat[] {
  const { today, days, pool, fixedPassengers } = options;
  const dayOffset = diffDays(today, trip.date);
  const rng = rngForTrip("bookings", trip, dayOffset);
  const demo = demoSeat ? [demoSeat] : [];

  if (trip.id === tripId(today, TODAY_T1.templateId)) {
    const fixedIds = new Set(fixedPassengers.map((customer) => customer.id));
    const others = rng.shuffle(pool.filter((customer) => !fixedIds.has(customer.id)));
    return [
      ...seatsFor(fixedPassengers, false),
      ...seatsFor(others.slice(0, TODAY_T1.others), false),
      ...seatsFor(others.slice(TODAY_T1.others, TODAY_T1.others + TODAY_T1.cancelled), true),
      ...demo,
    ];
  }

  const fullTripDate = nthOperatingDay(days, today, FULL_TRIP.opDay);
  if (fullTripDate && trip.id === tripId(fullTripDate, FULL_TRIP.templateId)) {
    const riders = rng.shuffle(pool);
    const seated = capacity - demo.length;
    return [
      ...seatsFor(riders.slice(0, seated), false),
      ...seatsFor(riders.slice(seated, seated + FULL_TRIP.cancelled), true),
      ...demo,
    ];
  }

  const [minLoad, maxLoad] = loadRange(dayOffset);
  const target = Math.round(capacity * rng.float(minLoad, maxLoad));
  return [...randomSeats(rng, pool, Math.max(0, target - demo.length)), ...demo];
}

interface DraftBooking extends Seat {
  trip: Trip;
  /** Position of the booking within its trip date's booking window, in [0, 1). */
  createdPoint: number;
  /** Position of a customer cancellation between creation and the latest possible moment. */
  cancelPoint: number;
}

/**
 * Bookings for a trip date are created during the 7 days before the date's first departure, and
 * never later than shortly before the data was generated.
 */
function bookingWindow(tripsOnDate: readonly Trip[], seededAtMs: number) {
  const firstDepartureMs = Math.min(
    ...tripsOnDate.map((trip) => istToEpoch(trip.date, trip.departureTime)),
  );
  const endMs = Math.min(firstDepartureMs - 30 * MS_PER_MINUTE, seededAtMs - 120 * MS_PER_MINUTE);
  return { startMs: endMs - 7 * MS_PER_DAY, endMs };
}

function toBooking(
  draft: DraftBooking,
  id: string,
  createdMs: number,
  seededAtMs: number,
): Booking {
  const { trip, customer, cancelledByCustomer } = draft;
  const createdAt = new Date(createdMs).toISOString();
  const base = {
    id,
    tripId: trip.id,
    customerId: customer.id,
    passengerName: customer.name,
    passengerMobile: customer.mobile,
    createdAt,
    completedAt: null,
    cancelledAt: null,
    cancellationSource: null,
    cancellationReason: null,
  } as const;
  const tripCancelledMs = trip.cancelledAt ? Date.parse(trip.cancelledAt) : Infinity;

  if (cancelledByCustomer) {
    const latestMs = Math.min(
      istToEpoch(trip.date, trip.departureTime) - 10 * MS_PER_MINUTE,
      seededAtMs - MS_PER_MINUTE,
      tripCancelledMs,
    );
    const cancelledAt = new Date(createdMs + draft.cancelPoint * (latestMs - createdMs)).toISOString();
    return {
      ...base,
      status: "cancelled",
      updatedAt: cancelledAt,
      cancelledAt,
      cancellationSource: "customer",
      cancellationReason: "Plans changed",
    };
  }
  if (trip.status === "cancelled" && trip.cancelledAt) {
    return {
      ...base,
      status: "cancelled",
      updatedAt: trip.cancelledAt,
      cancelledAt: trip.cancelledAt,
      cancellationSource: "trip_cancelled",
      cancellationReason: TRIP_CANCELLED_REASON,
    };
  }
  if (trip.status === "completed" && trip.completedAt) {
    return { ...base, status: "completed", updatedAt: trip.completedAt, completedAt: trip.completedAt };
  }
  return { ...base, status: "confirmed", updatedAt: createdAt };
}

/**
 * Bookings for every seeded trip. Within each trip date, ids follow creation order
 * (EXC-DDMMYY-001, -002, …), exactly as `nextBookingId` numbers new bookings.
 */
export function generateBookings(options: GenerateBookingsOptions): Booking[] {
  const { today, days, trips, buses, demoCustomer, seededAtMs } = options;
  const capacityByBus = new Map(buses.map((bus) => [bus.id, bus.capacity]));
  const demoSeats = new Map(
    DEMO_CUSTOMER_TRIPS.flatMap(({ opDay, templateId, cancelled }) => {
      const date = nthOperatingDay(days, today, opDay);
      const seat: Seat = { customer: demoCustomer, cancelledByCustomer: cancelled };
      return date ? [[tripId(date, templateId), seat] as const] : [];
    }),
  );

  return days.flatMap((date) => {
    const tripsOnDate = trips.filter((trip) => trip.date === date);
    if (tripsOnDate.length === 0) return [];
    const drafts = tripsOnDate.flatMap((trip) => {
      const capacity = capacityByBus.get(trip.busId);
      if (capacity === undefined) throw new Error(`Unknown bus ${trip.busId}`);
      const timingRng = rngForTrip("booking-times", trip, diffDays(today, date));
      return manifestFor(trip, capacity, options, demoSeats.get(trip.id)).map(
        (seat): DraftBooking => ({
          ...seat,
          trip,
          createdPoint: timingRng.next(),
          cancelPoint: timingRng.next(),
        }),
      );
    });

    const { startMs, endMs } = bookingWindow(tripsOnDate, seededAtMs);
    return drafts
      .toSorted((a, b) => a.createdPoint - b.createdPoint)
      .map((draft, index) =>
        toBooking(
          draft,
          formatBookingId(date, index + 1),
          Math.round(startMs + draft.createdPoint * (endMs - startMs)),
          seededAtMs,
        ),
      );
  });
}
