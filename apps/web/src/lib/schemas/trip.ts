import {
  type CancelTripInput,
  type CreateTripInput,
  TRIP_DIRECTIONS,
  type UpdateTripInput,
} from "@excelcabs/types";
import { z } from "zod";

import {
  isoDateField,
  notPastDateField,
  optionalReasonField,
  refIdField,
  timeField,
} from "./common";

/** `tripService.create`; the service applies date/holiday/availability rules itself. */
export const tripInputSchema = z.object({
  date: isoDateField,
  departureTime: timeField,
  busId: refIdField("bus"),
  direction: z.enum(TRIP_DIRECTIONS, { error: "Choose a direction" }),
  driverId: refIdField("driver"),
}) satisfies z.ZodType<CreateTripInput>;

export const tripUpdateSchema = tripInputSchema.partial() satisfies z.ZodType<UpdateTripInput>;

/**
 * Create / edit trip form: the service input with a not-in-the-past date. The direction labels
 * ("A → B" / "B → A") come from the selected bus's origin and destination.
 */
export const tripFormSchema = tripInputSchema.extend({ date: notPastDateField });
export type TripFormValues = z.infer<typeof tripFormSchema>;

export const cancelTripSchema = z.object({
  reason: optionalReasonField,
}) satisfies z.ZodType<CancelTripInput>;
