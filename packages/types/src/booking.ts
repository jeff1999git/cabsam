import type { ISODate, ISODateTime, PageQuery } from "./common";
import type { TripSummary } from "./trip";
import type { UserRef } from "./user";

export const BOOKING_STATUSES = ["confirmed", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const CANCELLATION_SOURCES = ["customer", "admin", "trip_cancelled", "holiday"] as const;
export type CancellationSource = (typeof CANCELLATION_SOURCES)[number];

/** One booking = one seat = one passenger. */
export interface Booking {
  /** Primary key and human reference: `EXC-DDMMYY-NNN` (trip date + per-date sequence). */
  id: string;
  tripId: string;
  /** Account that made the booking. */
  customerId: string;
  passengerName: string;
  passengerMobile: string;
  status: BookingStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  cancellationSource: CancellationSource | null;
  cancellationReason: string | null;
}

export interface BookingDetails extends Booking {
  trip: TripSummary;
  bookedBy: UserRef;
  /** Whether the calling user may cancel this booking right now. */
  canCancel: boolean;
}

export const MY_BOOKING_SCOPES = ["upcoming", "past", "cancelled", "all"] as const;
export type MyBookingScope = (typeof MY_BOOKING_SCOPES)[number];

export interface MyBookingsQuery {
  scope?: MyBookingScope;
}

export interface BookingListQuery extends PageQuery {
  /** Matches booking id, passenger name or passenger mobile. */
  q?: string;
  /** Trip date. */
  date?: ISODate;
  status?: BookingStatus;
  tripId?: string;
}

export interface CreateBookingInput {
  tripId: string;
  passengerName: string;
  passengerMobile: string;
}

export interface CancelBookingInput {
  reason?: string;
}
