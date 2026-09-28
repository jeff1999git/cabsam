import {
  ACCOUNT_STATUSES,
  type CreateDriverInput,
  type UpdateDriverInput,
} from "@excelcabs/types";
import { z } from "zod";

import { emailField, mobileField, passwordField, personNameField } from "./common";

/** Add driver form and `driverService.create`. */
export const driverCreateSchema = z.object({
  name: personNameField,
  email: emailField,
  mobile: mobileField,
  password: passwordField,
  status: z.enum(ACCOUNT_STATUSES),
}) satisfies z.ZodType<CreateDriverInput>;
export type DriverCreateValues = z.infer<typeof driverCreateSchema>;

/** Edit driver form: a blank password keeps the current one — omit it from the submitted patch. */
export const driverEditFormSchema = driverCreateSchema.extend({
  password: z.union([z.literal(""), passwordField]),
});
export type DriverEditValues = z.infer<typeof driverEditFormSchema>;

/** `driverService.update` patch. */
export const driverUpdateInputSchema =
  driverCreateSchema.partial() satisfies z.ZodType<UpdateDriverInput>;
