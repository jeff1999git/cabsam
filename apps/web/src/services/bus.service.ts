import type {
  Bus,
  BusListQuery,
  BusWithUsage,
  CreateBusInput,
  UpdateBusInput,
} from "@excelcabs/types";

import { mockBusService } from "./mock/bus.mock";

export interface BusService {
  /** Admin. Sorted by name, with usage counts. `q` matches name or registration number. */
  list(query?: BusListQuery): Promise<BusWithUsage[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<BusWithUsage>;
  /** Admin. @throws VALIDATION · CONFLICT(BUS_NAME_TAKEN | REGISTRATION_TAKEN) */
  create(input: CreateBusInput): Promise<Bus>;
  /**
   * Admin. Disable = `update(id, { status: "inactive" })`. Once the bus has trips its origin /
   * destination are locked (`totalTripCount > 0`); the duration may still change (existing trips
   * keep their snapshot).
   * @throws NOT_FOUND · VALIDATION · CONFLICT(BUS_NAME_TAKEN | REGISTRATION_TAKEN |
   *   BUS_ROUTE_LOCKED | CAPACITY_BELOW_BOOKINGS | HAS_UPCOMING_TRIPS)
   */
  update(id: string, patch: UpdateBusInput): Promise<Bus>;
}

/** Swap point: replace with an API-backed implementation. */
export const busService: BusService = mockBusService;
