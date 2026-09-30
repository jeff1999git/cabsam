import { BUS_STATUSES, type CreateBusInput, type UpdateBusInput } from "@excelcabs/types";
import { z } from "zod";

import { BUS_CAPACITY } from "@/config/business";

const REGISTRATION_RE = /^[A-Z]{2}-\d{2}-[A-Z]{1,3}-\d{4}$/;

/** 'kl 08 be 7310' / 'KL08BE7310' → 'KL-08-BE-7310'; unrecognised input is only upper-cased. */
function normalizeRegistration(value: string): string {
  const compact = value.toUpperCase().replace(/[\s-]/g, "");
  const match = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/.exec(compact);
  if (!match) return value.trim().toUpperCase();
  const [, state = "", district = "", series = "", number = ""] = match;
  return `${state}-${district.padStart(2, "0")}-${series}-${number.padStart(4, "0")}`;
}

/**
 * Add / edit bus form and `busService.create`. A bus is only a vehicle — where it runs is set per
 * trip. Register `capacity` with `valueAsNumber`.
 */
export const busInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Enter a bus name" })
    .max(40, { error: "Use at most 40 characters" }),
  registrationNumber: z
    .string()
    .overwrite(normalizeRegistration)
    .regex(REGISTRATION_RE, { error: "Use the format KL-08-BE-7310" }),
  capacity: z
    .number({ error: "Enter the seating capacity" })
    .int({ error: "Use a whole number" })
    .min(BUS_CAPACITY.min, { error: `At least ${BUS_CAPACITY.min} seats` })
    .max(BUS_CAPACITY.max, { error: `At most ${BUS_CAPACITY.max} seats` }),
  status: z.enum(BUS_STATUSES),
}) satisfies z.ZodType<CreateBusInput>;
export type BusFormValues = z.infer<typeof busInputSchema>;

/** `busService.update` patch. */
export const busUpdateSchema = busInputSchema.partial() satisfies z.ZodType<UpdateBusInput>;
