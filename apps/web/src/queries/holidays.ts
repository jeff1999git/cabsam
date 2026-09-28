import type { HolidayListQuery, ISODate } from "@excelcabs/types";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { isValidISODate } from "@/lib/datetime";
import { holidayService } from "@/services/holiday.service";

import { queryKeys } from "./keys";

/** Public: holidays (e.g. `{ from: today() }` for upcoming ones). */
export function useHolidays(query?: HolidayListQuery) {
  return useQuery({
    queryKey: queryKeys.holidays.list(query),
    queryFn: () => holidayService.list(query),
  });
}

/** Admin: live preview of what a holiday on `date` would cancel. Idle until `date` is a valid date. */
export function useHolidayImpact(date: ISODate | null | undefined) {
  const validDate = date && isValidISODate(date) ? date : null;
  return useQuery({
    queryKey: queryKeys.holidays.impact(validDate),
    queryFn: validDate ? () => holidayService.getImpact(validDate) : skipToken,
  });
}

/** Send `cancelScheduledTrips: true` once the admin has confirmed the impact. */
export function useCreateHoliday() {
  return useMutation({
    mutationFn: holidayService.create,
    meta: { invalidates: ["holidays", "trips", "bookings", "dashboard", "buses", "drivers", "routes"] },
  });
}

/** `mutate(holidayId)`. Trips the holiday cancelled stay cancelled. */
export function useDeleteHoliday() {
  return useMutation({
    mutationFn: holidayService.delete,
    meta: { invalidates: ["holidays", "trips", "dashboard"] },
  });
}
