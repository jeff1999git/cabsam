import type { CancelBookingInput, CreateBookingInput } from "@excelcabs/types";
import { z } from "zod";

import { isSameStop, mobileField, optionalReasonField, personNameField, stopField } from "./common";

/** Refinement-free, so the schemas below can build on its shape. */
const stopPointsBaseSchema = z.object({
  pickupPoint: stopField("Enter where you'll board"),
  dropPoint: stopField("Enter where you'll get off"),
});

function hasDistinctStops(values: z.output<typeof stopPointsBaseSchema>): boolean {
  return !isSameStop(values.pickupPoint, values.dropPoint);
}

const DISTINCT_STOPS_ISSUE = { error: "Drop point must differ from pickup", path: ["dropPoint"] };

/**
 * Pickup + drop point on their own (home search card, "Book a Trip" card). Pickup ≠ drop
 * (case-insensitive) is reported on `dropPoint`. `.extend()` keeps that rule; `.pick()` /
 * `.partial()` / `.omit()` throw on it (refined object).
 */
export const stopPointsSchema = stopPointsBaseSchema.refine(hasDistinctStops, DISTINCT_STOPS_ISSUE);
export type StopPointsValues = z.infer<typeof stopPointsSchema>;

/** Refinement-free, so `createBookingInputSchema` can extend it. */
const passengerDetailsBaseSchema = z.object({
  passengerName: personNameField,
  passengerMobile: mobileField,
  ...stopPointsBaseSchema.shape,
});

/**
 * Booking flow step 1: name + mobile prefilled from the signed-in customer, pickup + drop from the
 * home search (URL); all editable. Pickup ≠ drop is reported on `dropPoint`.
 */
export const passengerDetailsSchema = passengerDetailsBaseSchema.refine(hasDistinctStops, DISTINCT_STOPS_ISSUE);
export type PassengerDetailsValues = z.infer<typeof passengerDetailsSchema>;

export const createBookingInputSchema = passengerDetailsBaseSchema
  .extend({ tripId: z.string().min(1) })
  .refine(hasDistinctStops, DISTINCT_STOPS_ISSUE) satisfies z.ZodType<CreateBookingInput>;

export const cancelBookingSchema = z.object({
  reason: optionalReasonField,
}) satisfies z.ZodType<CancelBookingInput>;
