import {
  type CreateRouteInput,
  ROUTE_STATUSES,
  type UpdateRouteInput,
} from "@excelcabs/types";
import { z } from "zod";

import { ROUTE_DURATION_MINUTES } from "@/config/business";

import { isSameStop, placeNameField } from "./common";

const routeBaseSchema = z.object({
  origin: placeNameField,
  destination: placeNameField,
  durationMinutes: z
    .number({ error: "Enter the duration in minutes" })
    .int({ error: "Use whole minutes" })
    .min(ROUTE_DURATION_MINUTES.min, { error: `At least ${ROUTE_DURATION_MINUTES.min} minutes` })
    .max(ROUTE_DURATION_MINUTES.max, { error: `At most ${ROUTE_DURATION_MINUTES.max} minutes` }),
  status: z.enum(ROUTE_STATUSES),
});

/** Add / edit route form and `routeService.create`. Register duration with `valueAsNumber`. */
export const routeInputSchema = routeBaseSchema.refine(
  (route) => !isSameStop(route.origin, route.destination),
  { error: "Destination must differ from the origin", path: ["destination"] },
) satisfies z.ZodType<CreateRouteInput>;
export type RouteFormValues = z.infer<typeof routeInputSchema>;

/** `routeService.update` patch; the service checks origin ≠ destination on the merged route. */
export const routeUpdateSchema = routeBaseSchema.partial() satisfies z.ZodType<UpdateRouteInput>;
