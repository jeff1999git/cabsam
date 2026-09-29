import type {
  CreateHolidayInput,
  CreateHolidayResult,
  Holiday,
  HolidayImpact,
  HolidayListQuery,
  ISODate,
} from "@excelcabs/types";

import { mockHolidayService } from "./mock/holiday.mock";

export interface HolidayService {
  /**
   * Public (date pickers). Inclusive `from` / `to`; sorted by date. Sundays are closed without a
   * holiday record — use `tripService.search` (`closure`) or `nextOperatingDay` for service days.
   */
  list(query?: HolidayListQuery): Promise<Holiday[]>;
  /** Admin. What adding a holiday on `date` would cancel — for the add-holiday preview. @throws VALIDATION */
  getImpact(date: ISODate): Promise<HolidayImpact>;
  /**
   * Admin. With `cancelScheduledTrips: true`, cancels that day's scheduled trips and their bookings.
   * Sundays are rejected: every Sunday is already a holiday.
   * @throws VALIDATION(PAST_DATE | NON_OPERATING_DAY) · CONFLICT(HOLIDAY_EXISTS |
   *   HOLIDAY_TRIP_IN_PROGRESS | HOLIDAY_HAS_TRIPS — `details` is the HolidayImpact)
   */
  create(input: CreateHolidayInput): Promise<CreateHolidayResult>;
  /** Admin. Does not restore trips the holiday cancelled. @throws NOT_FOUND */
  delete(id: string): Promise<void>;
}

/** Swap point: replace with an API-backed implementation. */
export const holidayService: HolidayService = mockHolidayService;
