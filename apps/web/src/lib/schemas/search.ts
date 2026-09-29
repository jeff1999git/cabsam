import type { TripSearchQuery } from "@excelcabs/types";
import { z } from "zod";

import { isoDateField, notPastDateField } from "./common";

/**
 * The home page's travel date (`/?date=2026-09-28`): `safeParse({ date })` and fall back to today
 * when it fails (missing, malformed or in the past). Pickup / drop are `stopPointsSchema`
 * (`@/lib/schemas/booking`).
 */
export const tripSearchSchema = z.object({
  date: notPastDateField,
}) satisfies z.ZodType<TripSearchQuery>;
export type TripSearchValues = z.infer<typeof tripSearchSchema>;

/** Service-side shape check; the service applies the past-date rule itself. */
export const tripSearchInputSchema = z.object({
  date: isoDateField,
}) satisfies z.ZodType<TripSearchQuery>;
