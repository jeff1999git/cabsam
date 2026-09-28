import type {
  CustomerListQuery,
  CustomerWithStats,
  UpdateCustomerStatusInput,
  UpdateCustomerStatusResult,
} from "@excelcabs/types";

import { mockCustomerService } from "./mock/customer.mock";

/** Admin review of self-registered customer accounts (drivers and admins are never listed). */
export interface CustomerService {
  /** Admin. Newest sign-ups first. `q` matches name, email or mobile digits. */
  list(query?: CustomerListQuery): Promise<CustomerWithStats[]>;
  /** Admin. @throws NOT_FOUND */
  get(id: string): Promise<CustomerWithStats>;
  /**
   * Admin. Disabling blocks sign-in, ends the account's live session (its next service call fails
   * with UNAUTHORIZED / SESSION_INVALID, which signs that tab out) and cancels its confirmed
   * bookings on scheduled / in-progress trips (source "admin", reason "Account disabled" or the
   * given reason). Enabling does not restore bookings. Idempotent when the status is unchanged.
   * @throws NOT_FOUND · VALIDATION
   */
  setStatus(id: string, input: UpdateCustomerStatusInput): Promise<UpdateCustomerStatusResult>;
}

/** Swap point: replace with an API-backed implementation. */
export const customerService: CustomerService = mockCustomerService;
