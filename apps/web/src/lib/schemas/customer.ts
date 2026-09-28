import { ACCOUNT_STATUSES, type UpdateCustomerStatusInput } from "@excelcabs/types";
import { z } from "zod";

import { optionalReasonField } from "./common";

/** `customerService.setStatus` input; the disable-user dialog's reason field is `.pick({ reason: true })`. */
export const customerStatusSchema = z.object({
  status: z.enum(ACCOUNT_STATUSES),
  reason: optionalReasonField,
}) satisfies z.ZodType<UpdateCustomerStatusInput>;
export type CustomerStatusValues = z.infer<typeof customerStatusSchema>;
