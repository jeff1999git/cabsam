import type { CreateHolidayInput } from "@excelcabs/types";
import { z } from "zod";

import { dayOfWeek, isValidISODate } from "@/lib/datetime";

import { isoDateField, notPastDateField } from "./common";

/** Shown when a holiday is added on a Sunday (form and service). */
export const SUNDAY_HOLIDAY_MESSAGE = "Sundays are already holidays";

const reasonField = z
  .string()
  .trim()
  .min(3, { error: "Enter a reason" })
  .max(80, { error: "Use at most 80 characters" });

/**
 * Add holiday form: today or later and not a Sunday (every Sunday already has no service). Submit
 * with `cancelScheduledTrips: true` once the impact is confirmed.
 */
export const holidayFormSchema = z.object({
  date: notPastDateField.refine((date) => !isValidISODate(date) || dayOfWeek(date) !== 0, {
    error: SUNDAY_HOLIDAY_MESSAGE,
  }),
  reason: reasonField,
});
export type HolidayFormValues = z.infer<typeof holidayFormSchema>;

/** `holidayService.create`; the service applies the past-date, Sunday and duplicate rules itself. */
export const holidayInputSchema = z.object({
  date: isoDateField,
  reason: reasonField,
  cancelScheduledTrips: z.boolean().optional(),
}) satisfies z.ZodType<CreateHolidayInput>;
