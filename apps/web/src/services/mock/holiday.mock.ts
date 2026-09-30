import "client-only";

import type { Holiday, HolidayImpact, ISODate } from "@excelcabs/types";
import { z } from "zod";

import { dayOfWeek, formatDateLong, formatDayMonth, nowIso, today } from "@/lib/datetime";
import { pluralize } from "@/lib/format";
import { holidayId } from "@/lib/mock/holidays";
import type { MockDb } from "@/lib/mock/db";
import { isoDateField } from "@/lib/schemas/common";
import { holidayInputSchema, SUNDAY_HOLIDAY_MESSAGE } from "@/lib/schemas/holiday";

import { conflict, notFound, validation } from "../errors";
import type { HolidayService } from "../holiday.service";
import { cancelTripWithBookings, holidayOn } from "./_rules";
import { requireUser } from "./_session";
import { mockRead, mockWrite, parseInput } from "./_utils";
import { indexDb, toTripSummary } from "./_views";

const impactQuerySchema = z.object({ date: isoDateField });

function impactOf(db: Readonly<MockDb>, date: ISODate): HolidayImpact {
  const index = indexDb(db);
  const tripsOnDate = db.trips
    .filter((trip) => trip.date === date)
    .toSorted((a, b) => a.departureTime.localeCompare(b.departureTime));
  const scheduled = tripsOnDate.filter((trip) => trip.status === "scheduled");
  const scheduledIds = new Set(scheduled.map((trip) => trip.id));
  return {
    date,
    existingHoliday: holidayOn(db, date) ?? null,
    scheduledTrips: scheduled.map((trip) => toTripSummary(index, trip)),
    confirmedBookings: db.bookings.filter(
      (booking) => scheduledIds.has(booking.tripId) && booking.status === "confirmed",
    ).length,
    hasTripInProgress: tripsOnDate.some((trip) => trip.status === "in_progress"),
  };
}

export const mockHolidayService: HolidayService = {
  list(query = {}) {
    return mockRead((db) =>
      db.holidays
        .filter(
          (holiday) =>
            (!query.from || holiday.date >= query.from) && (!query.to || holiday.date <= query.to),
        )
        .toSorted((a, b) => a.date.localeCompare(b.date)),
    );
  },

  getImpact(date) {
    return mockRead((db) => {
      requireUser(db, ["admin"]);
      return impactOf(db, parseInput(impactQuerySchema, { date }).date);
    });
  },

  create(input) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const { date, reason, cancelScheduledTrips } = parseInput(holidayInputSchema, input);
      if (date < today()) {
        throw validation({ date: "Date cannot be in the past" }, "Date cannot be in the past", "PAST_DATE");
      }
      if (dayOfWeek(date) === 0) {
        throw validation({ date: SUNDAY_HOLIDAY_MESSAGE }, SUNDAY_HOLIDAY_MESSAGE, "NON_OPERATING_DAY");
      }
      const impact = impactOf(draft, date);
      if (impact.existingHoliday) {
        const message = `${formatDayMonth(date)} is already a holiday (${impact.existingHoliday.reason})`;
        throw conflict("HOLIDAY_EXISTS", message, { fieldErrors: { date: message } });
      }
      if (impact.hasTripInProgress) {
        throw conflict(
          "HOLIDAY_TRIP_IN_PROGRESS",
          `A trip on ${formatDayMonth(date)} is already in progress`,
        );
      }
      if (impact.scheduledTrips.length > 0 && cancelScheduledTrips !== true) {
        throw conflict(
          "HOLIDAY_HAS_TRIPS",
          `${pluralize(impact.scheduledTrips.length, "trip")} and ${pluralize(impact.confirmedBookings, "booking")} on ${formatDateLong(date)} would be cancelled`,
          { details: impact },
        );
      }

      const at = nowIso();
      const holiday: Holiday = { id: holidayId(date), date, reason, createdAt: at };
      draft.holidays.push(holiday);
      let cancelledBookings = 0;
      for (const summary of impact.scheduledTrips) {
        const trip = draft.trips.find((candidate) => candidate.id === summary.id);
        if (!trip) continue;
        cancelledBookings += cancelTripWithBookings(draft, trip, {
          reason: `Holiday: ${reason}`,
          source: "holiday",
          at,
        });
      }
      return { holiday, cancelledTrips: impact.scheduledTrips.length, cancelledBookings };
    });
  },

  delete(id) {
    return mockWrite((draft) => {
      requireUser(draft, ["admin"]);
      const index = draft.holidays.findIndex((holiday) => holiday.id === id);
      if (index === -1) throw notFound("Holiday");
      draft.holidays.splice(index, 1);
    });
  },
};
