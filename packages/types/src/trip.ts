import type { BookingStatus } from "./booking";
import type { BusRef } from "./bus";
import type { ISODate, ISODateTime, TimeHM } from "./common";
import type { Holiday } from "./holiday";
import type { DriverRef } from "./user";

/** `scheduled` is presented to people as "Upcoming". */
export const TRIP_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const ACTIVE_TRIP_STATUSES = ["scheduled", "in_progress"] as const satisfies readonly TripStatus[];

/** `outbound` runs the bus's origin → destination; `return` runs it the other way. */
export const TRIP_DIRECTIONS = ["outbound", "return"] as const;
export type TripDirection = (typeof TRIP_DIRECTIONS)[number];

/** The stops a trip runs between, derived from its bus and direction. */
export interface RouteEndpoints {
  origin: string;
  destination: string;
}

export interface Trip {
  id: string;
  busId: string;
  direction: TripDirection;
  /** User id of the assigned driver. */
  driverId: string;
  date: ISODate;
  departureTime: TimeHM;
  /** Snapshot of the bus's route duration when the trip was created / its bus changed. */
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
  route: RouteEndpoints;
  direction: TripDirection;
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
  /** Set when `date` is a holiday — `trips` is then empty. */
  holiday: Holiday | null;
  /**
   * Every non-cancelled trip on `date` (all buses, both directions), by departure time then bus
   * name. Departed / full trips are included — read `bookability`.
   */
  trips: TripSearchItem[];
}

export const TRIP_EDITABLE_FIELDS = ["date", "departureTime", "busId", "direction", "driverId"] as const;
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
  /** The booking's free-text pickup point. */
  pickupPoint: string;
  /** The booking's free-text drop point. */
  dropPoint: string;
  status: BookingStatus;
}

export interface TripWithPassengers extends TripDetails {
  /** Non-cancelled bookings, sorted by passenger name. */
  passengers: TripPassenger[];
}

/** Customers pick a bus trip by date; where they board and get off is typed on the booking. */
export interface TripSearchQuery {
  date: ISODate;
}

export interface TripListQuery {
  /** Inclusive. */
  dateFrom?: ISODate;
  /** Inclusive. */
  dateTo?: ISODate;
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
  busId: string;
  direction: TripDirection;
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
