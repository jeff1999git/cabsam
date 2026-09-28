import type {
  Booking,
  Bus,
  CancellationSource,
  Customer,
  ISODate,
  ISODateTime,
  Trip,
} from "@excelcabs/types";

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
const ACCOUNT_DISABLED_REASON = "Account disabled";
/** `createdPoint` of a booking pinned to the end of its date's booking window. */
const LAST_IN_WINDOW = 1;

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

/** The disabled spam account's one booking, cancelled when the admin disabled the account. */
const DISABLED_CUSTOMER_TRIP = { opDay: 2, templateId: "t3" } as const;

/** Today's 7:00 AM manifest: the fixed riders + 15 others = 18 of 40 seats, plus 2 cancellations. */
const TODAY_T1 = { templateId: "t1", others: 15, cancelled: 2 } as const;
/** The next operating day's 9:00 AM trip is sold out. */
const FULL_TRIP = { opDay: 1, templateId: "t4", cancelled: 1 } as const;

interface Seat {
  customer: Customer;
  /** Cancelled before departure by the customer, or by the admin disabling the account. */
  cancelledBy: Extract<CancellationSource, "customer" | "admin"> | null;
  /** Fixed position in the date's booking window (random when omitted). */
  createdPoint?: number;
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
  /** Disabled account whose one booking was cancelled at `disabledAt`. */
  disabledCustomer: { customer: Customer; disabledAt: ISODateTime };
}

/** Stable per timetable slot and day offset, so every day's data looks the same. */
function rngForTrip(purpose: string, trip: Trip, dayOffset: number): Rng {
  return rngFor(purpose, trip.departureTime, trip.busId, trip.direction, dayOffset);
}

function seatsFor(customers: readonly Customer[], cancelledByCustomer: boolean): Seat[] {
  return customers.map((customer) => ({ customer, cancelledBy: cancelledByCustomer ? "customer" : null }));
}

function randomSeats(rng: Rng, pool: readonly Customer[], count: number): Seat[] {
  return rng
    .shuffle(pool)
    .slice(0, count)
    .map((customer) => ({ customer, cancelledBy: rng.chance(CUSTOMER_CANCEL_RATE) ? "customer" : null }));
}

/** Seats of the named accounts, by trip id: Arjun's history and the spam account's one booking. */
function pinnedSeats(options: GenerateBookingsOptions): Map<string, Seat[]> {
  const { today, days, demoCustomer, disabledCustomer } = options;
  const pinned = new Map<string, Seat[]>();
  const pin = (opDay: number, templateId: string, seat: Seat) => {
    const date = nthOperatingDay(days, today, opDay);
    if (!date) return;
    const id = tripId(date, templateId);
    pinned.set(id, [...(pinned.get(id) ?? []), seat]);
  };
  for (const { opDay, templateId, cancelled } of DEMO_CUSTOMER_TRIPS) {
    pin(opDay, templateId, { customer: demoCustomer, cancelledBy: cancelled ? "customer" : null });
  }
  // Last booking of its date, so every other booking keeps its id.
  pin(DISABLED_CUSTOMER_TRIP.opDay, DISABLED_CUSTOMER_TRIP.templateId, {
    customer: disabledCustomer.customer,
    cancelledBy: "admin",
    createdPoint: LAST_IN_WINDOW,
  });
  return pinned;
}

/** Seated passengers for one trip, drawn without replacement (no duplicate mobiles). */
function manifestFor(
  trip: Trip,
  capacity: number,
  options: GenerateBookingsOptions,
  pinned: readonly Seat[],
): Seat[] {
  const { today, days, pool, fixedPassengers } = options;
  const dayOffset = diffDays(today, trip.date);
  const rng = rngForTrip("bookings", trip, dayOffset);

  if (trip.id === tripId(today, TODAY_T1.templateId)) {
    const fixedIds = new Set(fixedPassengers.map((customer) => customer.id));
    const others = rng.shuffle(pool.filter((customer) => !fixedIds.has(customer.id)));
    return [
      ...seatsFor(fixedPassengers, false),
      ...seatsFor(others.slice(0, TODAY_T1.others), false),
      ...seatsFor(others.slice(TODAY_T1.others, TODAY_T1.others + TODAY_T1.cancelled), true),
      ...pinned,
    ];
  }

  const pinnedSeated = pinned.filter((seat) => seat.cancelledBy === null).length;
  const fullTripDate = nthOperatingDay(days, today, FULL_TRIP.opDay);
  if (fullTripDate && trip.id === tripId(fullTripDate, FULL_TRIP.templateId)) {
    const riders = rng.shuffle(pool);
    const seated = capacity - pinnedSeated;
    return [
      ...seatsFor(riders.slice(0, seated), false),
      ...seatsFor(riders.slice(seated, seated + FULL_TRIP.cancelled), true),
      ...pinned,
    ];
  }

  const [minLoad, maxLoad] = loadRange(dayOffset);
  const target = Math.round(capacity * rng.float(minLoad, maxLoad));
  return [...randomSeats(rng, pool, Math.max(0, target - pinnedSeated)), ...pinned];
}

interface DraftBooking extends Seat {
  trip: Trip;
  /** Position of the booking within its trip date's booking window, in [0, 1]. */
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
  options: Pick<GenerateBookingsOptions, "seededAtMs" | "disabledCustomer">,
): Booking {
  const { seededAtMs, disabledCustomer } = options;
  const { trip, customer, cancelledBy } = draft;
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

  if (cancelledBy === "admin") {
    const cancelledAt = disabledCustomer.disabledAt;
    return {
      ...base,
      status: "cancelled",
      updatedAt: cancelledAt,
      cancelledAt,
      cancellationSource: "admin",
      cancellationReason: ACCOUNT_DISABLED_REASON,
    };
  }
  if (cancelledBy === "customer") {
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
  const { today, days, trips, buses, seededAtMs } = options;
  const capacityByBus = new Map(buses.map((bus) => [bus.id, bus.capacity]));
  const pinned = pinnedSeats(options);

  return days.flatMap((date) => {
    const tripsOnDate = trips.filter((trip) => trip.date === date);
    if (tripsOnDate.length === 0) return [];
    const drafts = tripsOnDate.flatMap((trip) => {
      const capacity = capacityByBus.get(trip.busId);
      if (capacity === undefined) throw new Error(`Unknown bus ${trip.busId}`);
      const timingRng = rngForTrip("booking-times", trip, diffDays(today, date));
      return manifestFor(trip, capacity, options, pinned.get(trip.id) ?? []).map(
        (seat): DraftBooking => ({
          ...seat,
          trip,
          createdPoint: seat.createdPoint ?? timingRng.next(),
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
          options,
        ),
      );
  });
}
