import type {
  CreateDriverInput,
  Driver,
  DriverListQuery,
  DriverWithUsage,
  UpdateDriverInput,
} from "@excelcabs/types";

import { mockDriverService } from "./mock/driver.mock";

/** Admin management of driver accounts. */
export interface DriverService {
  /** Admin. Sorted by name. `q` matches name, email or mobile. */
  list(query?: DriverListQuery): Promise<DriverWithUsage[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<DriverWithUsage>;
  /** Admin. @throws VALIDATION · CONFLICT(EMAIL_TAKEN) */
  create(input: CreateDriverInput): Promise<Driver>;
  /**
   * Admin. Omitted password = unchanged. Disable = `update(id, { status: "disabled" })`, which also
   * ends the driver's live session. @throws NOT_FOUND · VALIDATION · CONFLICT(EMAIL_TAKEN | HAS_UPCOMING_TRIPS)
   */
  update(id: string, patch: UpdateDriverInput): Promise<Driver>;
}

/** Swap point: replace with an API-backed implementation. */
export const driverService: DriverService = mockDriverService;
