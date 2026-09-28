/**
 * Admin list filters kept in the URL. Every field falls back (`.catch`) instead of failing, so a
 * hand-edited or stale URL still renders a sensible list.
 */
import { BOOKING_STATUSES, TRIP_STATUSES } from "@excelcabs/types";
import { z } from "zod";

import { isoDateField } from "./common";

const optionalText = z.string().trim().min(1).optional().catch(undefined);
const optionalDate = isoDateField.optional().catch(undefined);

export const bookingFiltersSchema = z.object({
  q: optionalText,
  date: optionalDate,
  status: z.enum(BOOKING_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

export const tripFiltersSchema = z.object({
  dateFrom: optionalDate,
  dateTo: optionalDate,
  busId: optionalText,
  driverId: optionalText,
  status: z.enum(TRIP_STATUSES).optional().catch(undefined),
});
export type TripFilters = z.infer<typeof tripFiltersSchema>;

/** Parses URL search params with a `.catch()`-guarded filter schema (never throws). */
export function parseSearchParams<T extends z.ZodType>(
  schema: T,
  params: Pick<URLSearchParams, "entries">,
): z.output<T> {
  return schema.parse(Object.fromEntries(params.entries()));
}
