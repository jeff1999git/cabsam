import type {
  Bus,
  BusListQuery,
  BusWithUsage,
  CreateBusInput,
  UpdateBusInput,
} from "@excelcabs/types";

import { mockBusService } from "./mock/bus.mock";

/** The fleet. A bus has no route of its own: trips (see `TripService`) say where it runs. */
export interface BusService {
  /** Admin. Sorted by name, with usage counts. `q` matches name or registration number. */
  list(query?: BusListQuery): Promise<BusWithUsage[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<BusWithUsage>;
  /** Admin. @throws VALIDATION · CONFLICT(BUS_NAME_TAKEN | REGISTRATION_TAKEN) */
  create(input: CreateBusInput): Promise<Bus>;
  /**
   * Admin. Disable = `update(id, { status: "inactive" })`. Capacity cannot drop below the bookings
   * of an upcoming trip (`maxBookedOnUpcomingTrip`).
   * @throws NOT_FOUND · VALIDATION · CONFLICT(BUS_NAME_TAKEN | REGISTRATION_TAKEN |
   *   CAPACITY_BELOW_BOOKINGS | HAS_UPCOMING_TRIPS)
   */
  update(id: string, patch: UpdateBusInput): Promise<Bus>;
}

/** Swap point: replace with an API-backed implementation. */
export const busService: BusService = mockBusService;
