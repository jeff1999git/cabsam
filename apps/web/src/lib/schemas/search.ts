import type { TripSearchQuery } from "@excelcabs/types";
import { z } from "zod";

import { isoDateField, isSameStop, notPastDateField } from "./common";

const stopField = (label: string) => z.string().trim().min(1, { error: `Select ${label}` });

/**
 * Home search form and its URL state (`/?date=2026-09-28&from=Shakthan+Stand&to=SmartCity`):
 * `safeParse(Object.fromEntries(searchParams))` and only search when it succeeds.
 */
export const tripSearchSchema = z
  .object({
    date: notPastDateField,
    from: stopField("a boarding point"),
    to: stopField("a destination"),
  })
  .refine((query) => !isSameStop(query.from, query.to), {
    error: "Choose a different destination",
    path: ["to"],
  }) satisfies z.ZodType<TripSearchQuery>;
export type TripSearchValues = z.infer<typeof tripSearchSchema>;

/** Service-side shape check; the service applies the past-date and same-stop rules itself. */
export const tripSearchInputSchema = z.object({
  date: isoDateField,
  from: stopField("a boarding point"),
  to: stopField("a destination"),
}) satisfies z.ZodType<TripSearchQuery>;
