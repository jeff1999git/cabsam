import type { BookingStatus } from "./booking";
import type { BusRef } from "./bus";
import type { ISODate, ISODateTime, TimeHM } from "./common";
import type { Holiday } from "./holiday";
import type { RouteRef } from "./route";
import type { DriverRef } from "./user";

/** `scheduled` is presented to people as "Upcoming". */
export const TRIP_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const ACTIVE_TRIP_STATUSES = ["scheduled", "in_progress"] as const satisfies readonly TripStatus[];

export interface Trip {
  id: string;
  routeId: string;
  busId: string;
  /** User id of the assigned driver. */
  driverId: string;
  date: ISODate;
  departureTime: TimeHM;
  /** Snapshot of the route duration when the trip was created / its route changed. */
  durationMinutes: number;
  status: TripStatus;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  cancellationReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const TRIP_UNBOOKABLE_REASONS = ["not_scheduled", "holiday", "departed", "full"] as const;
export type TripUnbookableReason = (typeof TRIP_UNBOOKABLE_REASONS)[number];

export type TripBookability =
  | { bookable: true }
  | { bookable: false; reason: TripUnbookableReason };

/** Denormalised trip row used by lists and embedded in bookings. */
export interface TripSummary {
  id: string;
  date: ISODate;
  departureTime: TimeHM;
  arrivalTime: TimeHM;
  durationMinutes: number;
  status: TripStatus;
  route: RouteRef;
  bus: BusRef;
  driver: DriverRef;
  capacity: number;
  /** Non-cancelled bookings (confirmed + completed). */
  bookedSeats: number;
  availableSeats: number;
}

export interface TripSearchItem extends TripSummary {
  bookability: TripBookability;
}

export interface TripSearchResult {
  date: ISODate;
  from: string;
  to: string;
  /** Set when `date` is a holiday — `trips` is then empty. */
  holiday: Holiday | null;
  trips: TripSearchItem[];
}

export const TRIP_EDITABLE_FIELDS = ["date", "departureTime", "routeId", "busId", "driverId"] as const;
export type TripEditableField = (typeof TRIP_EDITABLE_FIELDS)[number];

/** What the calling user may do with the trip right now (computed by the service). */
export interface TripPermissions {
  canEdit: boolean;
  canCancel: boolean;
  canStart: boolean;
  canComplete: boolean;
  /** Fields that cannot change because the trip already has bookings. */
  lockedFields: TripEditableField[];
}

export interface TripDetails extends TripSearchItem {
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  cancellationReason: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  permissions: TripPermissions;
}

export interface TripPassenger {
  bookingId: string;
  name: string;
  mobile: string;
  status: BookingStatus;
}

export interface TripWithPassengers extends TripDetails {
  /** Non-cancelled bookings, sorted by passenger name. */
  passengers: TripPassenger[];
}

export interface TripSearchQuery {
  date: ISODate;
  from: string;
  to: string;
}

export interface TripListQuery {
  /** Inclusive. */
  dateFrom?: ISODate;
  /** Inclusive. */
  dateTo?: ISODate;
  routeId?: string;
  busId?: string;
  driverId?: string;
  status?: TripStatus;
}

export interface MyTripsQuery {
  /** Inclusive; defaults to today. */
  dateFrom?: ISODate;
  /** Inclusive; defaults to `dateFrom`. */
  dateTo?: ISODate;
}

export interface CreateTripInput {
  date: ISODate;
  departureTime: TimeHM;
  routeId: string;
  busId: string;
  driverId: string;
}

export type UpdateTripInput = Partial<CreateTripInput>;

export interface CancelTripInput {
  reason?: string;
}

export interface CancelTripResult {
  trip: TripDetails;
  cancelledBookings: number;
}
