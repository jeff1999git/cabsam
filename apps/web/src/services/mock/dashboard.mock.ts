import "client-only";

import { TRIP_STATUSES, type TripStatus } from "@excelcabs/types";

import { RECENT_BOOKINGS_LIMIT } from "@/config/business";
import { instantToIst, nowIst } from "@/lib/datetime";

import type { DashboardService } from "../dashboard.service";
import { requireUser } from "./_session";
import { mockRead } from "./_utils";
import { indexDb, toBookingDetails, toTripSummary } from "./_views";

export const mockDashboardService: DashboardService = {
  getAdminSummary() {
    return mockRead((db) => {
      const admin = requireUser(db, ["admin"]);
      const now = nowIst();
      const index = indexDb(db);

      const todaysTrips = db.trips
        .filter((trip) => trip.date === now.date)
        .toSorted((a, b) => a.departureTime.localeCompare(b.departureTime));
      const byStatus = Object.fromEntries(TRIP_STATUSES.map((status) => [status, 0])) as Record<TripStatus, number>;
      for (const trip of todaysTrips) byStatus[trip.status] += 1;
      const todaysTripIds = new Set(todaysTrips.map((trip) => trip.id));

      const drivers = db.users.filter((user) => user.role === "driver");
      const recentBookings = db.bookings
        .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        .slice(0, RECENT_BOOKINGS_LIMIT)
        .map((booking) => toBookingDetails(index, booking, admin, now));

      return {
        date: now.date,
        todaysTrips: {
          total: todaysTrips.length,
          byStatus,
          items: todaysTrips.map((trip) => toTripSummary(index, trip)),
        },
        todaysBookings: {
          travellingToday: db.bookings.filter(
            (booking) => todaysTripIds.has(booking.tripId) && booking.status !== "cancelled",
          ).length,
          createdToday: db.bookings.filter(
            (booking) => instantToIst(booking.createdAt).date === now.date,
          ).length,
        },
        buses: {
          active: db.buses.filter((bus) => bus.status === "active").length,
          total: db.buses.length,
        },
        drivers: {
          active: drivers.filter((driver) => driver.status === "active").length,
          total: drivers.length,
        },
        recentBookings,
        nextHoliday:
          db.holidays
            .filter((holiday) => holiday.date >= now.date)
            .toSorted((a, b) => a.date.localeCompare(b.date))[0] ?? null,
      };
    });
  },
};
