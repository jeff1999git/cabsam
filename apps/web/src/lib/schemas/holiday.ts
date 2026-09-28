import type { CreateHolidayInput } from "@excelcabs/types";
import { z } from "zod";

import { isoDateField, notPastDateField } from "./common";

const reasonField = z
  .string()
  .trim()
  .min(3, { error: "Enter a reason" })
  .max(80, { error: "Use at most 80 characters" });

/** Add holiday form. Submit with `cancelScheduledTrips: true` once the impact is confirmed. */
export const holidayFormSchema = z.object({
  date: notPastDateField,
  reason: reasonField,
});
export type HolidayFormValues = z.infer<typeof holidayFormSchema>;

/** `holidayService.create`; the service applies the past-date and duplicate rules itself. */
export const holidayInputSchema = z.object({
  date: isoDateField,
  reason: reasonField,
  cancelScheduledTrips: z.boolean().optional(),
}) satisfies z.ZodType<CreateHolidayInput>;
