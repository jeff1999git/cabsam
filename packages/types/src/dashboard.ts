import type { BookingDetails } from "./booking";
import type { ISODate } from "./common";
import type { Holiday } from "./holiday";
import type { TripStatus, TripSummary } from "./trip";

export interface AdminDashboardSummary {
  date: ISODate;
  todaysTrips: {
    total: number;
    byStatus: Record<TripStatus, number>;
    items: TripSummary[];
  };
  todaysBookings: {
    /** Non-cancelled bookings on today's trips (headline figure). */
    travellingToday: number;
    /** Bookings created today (any trip date). */
    createdToday: number;
  };
  buses: { active: number; total: number };
  drivers: { active: number; total: number };
  /** Latest bookings by creation time, any status. */
  recentBookings: BookingDetails[];
  nextHoliday: Holiday | null;
}
