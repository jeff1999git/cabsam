import type { ISODate, ISODateTime } from "./common";
import type { TripSummary } from "./trip";

/** A date on which the shuttle service does not operate. */
export interface Holiday {
  id: string;
  date: ISODate;
  reason: string;
  createdAt: ISODateTime;
}

export interface HolidayListQuery {
  from?: ISODate;
  to?: ISODate;
}

export interface CreateHolidayInput {
  date: ISODate;
  reason: string;
  /**
   * Must be `true` when scheduled trips exist on `date`; the service then cancels them and their
   * bookings. Otherwise the service rejects with CONFLICT / HOLIDAY_HAS_TRIPS.
   */
  cancelScheduledTrips?: boolean;
}

/** Preview of what adding a holiday on `date` would affect. */
export interface HolidayImpact {
  date: ISODate;
  existingHoliday: Holiday | null;
  scheduledTrips: TripSummary[];
  confirmedBookings: number;
  hasTripInProgress: boolean;
}

export interface CreateHolidayResult {
  holiday: Holiday;
  cancelledTrips: number;
  cancelledBookings: number;
}
