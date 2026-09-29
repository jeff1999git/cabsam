import type {
  BookingDetails,
  BookingListQuery,
  CancelBookingInput,
  CreateBookingInput,
  MyBookingsQuery,
  Paginated,
} from "@excelcabs/types";

import { mockBookingService } from "./mock/booking.mock";

export interface BookingService {
  /**
   * Customer. One booking = one seat for the named passenger, boarding at `pickupPoint` and getting
   * off at `dropPoint` (free text, not checked against the route; a drop equal to the pickup is
   * `fieldErrors.dropPoint`).
   * @throws VALIDATION · NOT_FOUND(trip) ·
   *   CONFLICT(TRIP_NOT_SCHEDULED | TRIP_ON_HOLIDAY | TRIP_DEPARTED | TRIP_FULL | DUPLICATE_BOOKING)
   */
  create(input: CreateBookingInput): Promise<BookingDetails>;
  /**
   * Customer. `upcoming` = confirmed (soonest first); `past` = completed, `cancelled`, `all`
   * (default) — most recent trip first.
   */
  listMine(query?: MyBookingsQuery): Promise<BookingDetails[]>;
  /** Customer (own bookings; others are NOT_FOUND) or admin. Drivers get FORBIDDEN. */
  get(id: string): Promise<BookingDetails>;
  /**
   * Customer (own, until departure) or admin (confirmed booking on a scheduled / in-progress trip).
   * @throws NOT_FOUND · FORBIDDEN · CONFLICT(BOOKING_NOT_CANCELLABLE | CANCELLATION_CLOSED)
   */
  cancel(id: string, input?: CancelBookingInput): Promise<BookingDetails>;
  /** Admin. Newest first; `q` matches booking id, passenger name, mobile digits, pickup or drop point. */
  list(query?: BookingListQuery): Promise<Paginated<BookingDetails>>;
}

/** Swap point: replace with an API-backed implementation. */
export const bookingService: BookingService = mockBookingService;
