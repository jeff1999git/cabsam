import "client-only";

import type {
  Booking,
  BookingListQuery,
  MyBookingScope,
  Trip,
  TripUnbookableReason,
  User,
} from "@excelcabs/types";

import { BOOKINGS_PAGE_SIZE } from "@/config/business";
import { dateTimeKey, nowIso, nowIst } from "@/lib/datetime";
import type { MockDb } from "@/lib/mock/db";
import { cancelBookingSchema, createBookingInputSchema } from "@/lib/schemas/booking";

import type { BookingService } from "../booking.service";
import { conflict, notFound } from "../errors";
import {
  bookingCancelBlocker,
  cancelBooking,
  holidayMessage,
  holidayOn,
  nextBookingId,
  type RuleViolation,
} from "./_rules";
import { requireUser } from "./_session";
import { mockRead, mockWrite, parseInput } from "./_utils";
import { type DbIndex, indexDb, toBookingDetails, toTripSearchItem } from "./_views";

function unbookableViolation(
  reason: TripUnbookableReason,
  db: Readonly<MockDb>,
  trip: Trip,
): RuleViolation {
  switch (reason) {
    case "not_scheduled":
      return { reason: "TRIP_NOT_SCHEDULED", message: "This trip is no longer open for booking" };
    case "holiday": {
      const holiday = holidayOn(db, trip.date);
      return { reason: "TRIP_ON_HOLIDAY", message: holiday ? holidayMessage(holiday) : "No service on this day" };
    }
    case "departed":
      return { reason: "TRIP_DEPARTED", message: "This trip has already departed" };
    case "full":
      return { reason: "TRIP_FULL", message: "Sorry, this trip is full" };
  }
}

function tripOf(index: DbIndex, booking: Booking): Trip {
  const trip = index.trips.get(booking.tripId);
  if (!trip) throw notFound("Trip");
  return trip;
}

/** The booking if `viewer` may see it: admins see all, customers their own; drivers none. */
function findVisibleBooking(db: Readonly<MockDb>, id: string, viewer: User): Booking {
  const booking = db.bookings.find((candidate) => candidate.id === id);
  if (!booking || (viewer.role === "customer" && booking.customerId !== viewer.id)) {
    throw notFound("Booking");
  }
  return booking;
}

const SCOPE_STATUS: Record<Exclude<MyBookingScope, "all">, Booking["status"]> = {
  upcoming: "confirmed",
  past: "completed",
  cancelled: "cancelled",
};

function matchesQuery(booking: Booking, trip: Trip | undefined, query: BookingListQuery): boolean {
  if (query.status && booking.status !== query.status) return false;
  if (query.tripId && booking.tripId !== query.tripId) return false;
  if (query.customerId && booking.customerId !== query.customerId) return false;
  if (query.date && trip?.date !== query.date) return false;
  const q = query.q?.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    booking.id.toLowerCase().includes(q) ||
    booking.passengerName.toLowerCase().includes(q) ||
    booking.pickupPoint.toLowerCase().includes(q) ||
    booking.dropPoint.toLowerCase().includes(q) ||
    (digits.length > 0 && booking.passengerMobile.includes(digits))
  );
}

export const mockBookingService: BookingService = {
  create(input) {
    return mockWrite((draft) => {
      const customer = requireUser(draft, ["customer"]);
      const values = parseInput(createBookingInputSchema, input);
      const trip = draft.trips.find((candidate) => candidate.id === values.tripId);
      if (!trip) throw notFound("Trip");

      const now = nowIst();
      const { bookability } = toTripSearchItem(indexDb(draft), trip, now);
      if (!bookability.bookable) {
        const violation = unbookableViolation(bookability.reason, draft, trip);
        throw conflict(violation.reason, violation.message);
      }
      const duplicate = draft.bookings.some(
        (booking) =>
          booking.tripId === trip.id &&
          booking.status !== "cancelled" &&
          booking.passengerMobile === values.passengerMobile,
      );
      if (duplicate) {
        const message = "This passenger is already booked on this trip";
        throw conflict("DUPLICATE_BOOKING", message, { fieldErrors: { passengerMobile: message } });
      }

      const at = nowIso();
      const booking: Booking = {
        id: nextBookingId(draft, trip.date),
        tripId: trip.id,
        customerId: customer.id,
        passengerName: values.passengerName,
        passengerMobile: values.passengerMobile,
        pickupPoint: values.pickupPoint,
        dropPoint: values.dropPoint,
        status: "confirmed",
        createdAt: at,
        updatedAt: at,
        completedAt: null,
        cancelledAt: null,
        cancellationSource: null,
        cancellationReason: null,
      };
      draft.bookings.push(booking);
      return toBookingDetails(indexDb(draft), booking, customer, now);
    });
  },

  listMine(query = {}) {
    return mockRead((db) => {
      const customer = requireUser(db, ["customer"]);
      const scope = query.scope ?? "all";
      const index = indexDb(db);
      const now = nowIst();
      const departure = (booking: Booking) => {
        const trip = tripOf(index, booking);
        return dateTimeKey(trip.date, trip.departureTime);
      };
      const soonestFirst = scope === "upcoming";
      return db.bookings
        .filter(
          (booking) =>
            booking.customerId === customer.id &&
            (scope === "all" || booking.status === SCOPE_STATUS[scope]),
        )
        .toSorted((a, b) =>
          soonestFirst ? departure(a).localeCompare(departure(b)) : departure(b).localeCompare(departure(a)),
        )
        .map((booking) => toBookingDetails(index, booking, customer, now));
    });
  },

  get(id) {
    return mockRead((db) => {
      const viewer = requireUser(db, ["customer", "admin"]);
      return toBookingDetails(indexDb(db), findVisibleBooking(db, id, viewer), viewer, nowIst());
    });
  },

  cancel(id, input = {}) {
    return mockWrite((draft) => {
      const viewer = requireUser(draft, ["customer", "admin"]);
      const { reason } = parseInput(cancelBookingSchema, input);
      const booking = findVisibleBooking(draft, id, viewer);
      const index = indexDb(draft);
      const now = nowIst();
      const blocker = bookingCancelBlocker(viewer, booking, tripOf(index, booking), now);
      if (blocker) throw conflict(blocker.reason, blocker.message);

      const source = viewer.role === "admin" ? "admin" : "customer";
      cancelBooking(booking, {
        reason: reason || (source === "admin" ? "Cancelled by Excel Cabs" : "Cancelled by customer"),
        source,
        at: nowIso(),
      });
      return toBookingDetails(indexDb(draft), booking, viewer, now);
    });
  },

  list(query = {}) {
    return mockRead((db) => {
      const admin = requireUser(db, ["admin"]);
      const index = indexDb(db);
      const now = nowIst();
      const matches = db.bookings
        .filter((booking) => matchesQuery(booking, index.trips.get(booking.tripId), query))
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

      const pageSize = Math.min(Math.max(1, query.pageSize ?? BOOKINGS_PAGE_SIZE.default), BOOKINGS_PAGE_SIZE.max);
      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
      const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
      return {
        items: matches
          .slice((page - 1) * pageSize, page * pageSize)
          .map((booking) => toBookingDetails(index, booking, admin, now)),
        page,
        pageSize,
        total: matches.length,
        pageCount,
      };
    });
  },
};
