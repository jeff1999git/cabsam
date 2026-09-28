import type { CancelBookingInput, CreateBookingInput } from "@excelcabs/types";
import { z } from "zod";

import { mobileField, optionalReasonField, personNameField } from "./common";

/** Booking flow step 1 — prefill from the signed-in customer, editable. */
export const passengerDetailsSchema = z.object({
  passengerName: personNameField,
  passengerMobile: mobileField,
});
export type PassengerDetailsValues = z.infer<typeof passengerDetailsSchema>;

export const createBookingInputSchema = passengerDetailsSchema.extend({
  tripId: z.string().min(1),
}) satisfies z.ZodType<CreateBookingInput>;

export const cancelBookingSchema = z.object({
  reason: optionalReasonField,
}) satisfies z.ZodType<CancelBookingInput>;
