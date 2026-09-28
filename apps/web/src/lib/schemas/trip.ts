import type { CancelTripInput, CreateTripInput, UpdateTripInput } from "@excelcabs/types";
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
  routeId: refIdField("route"),
  busId: refIdField("bus"),
  driverId: refIdField("driver"),
}) satisfies z.ZodType<CreateTripInput>;

export const tripUpdateSchema = tripInputSchema.partial() satisfies z.ZodType<UpdateTripInput>;

/**
 * Create / edit trip form. The form picks From and To (To lists only destinations with an active
 * route from From) and maps them to `routeId` on submit; map a service `routeId` field error back
 * onto `to` with `applyServiceError(error, setError, { routeId: "to" })`.
 */
export const tripFormSchema = z.object({
  date: notPastDateField,
  departureTime: timeField,
  from: refIdField("boarding point"),
  to: refIdField("destination"),
  busId: refIdField("bus"),
  driverId: refIdField("driver"),
});
export type TripFormValues = z.infer<typeof tripFormSchema>;

export const cancelTripSchema = z.object({
  reason: optionalReasonField,
}) satisfies z.ZodType<CancelTripInput>;
