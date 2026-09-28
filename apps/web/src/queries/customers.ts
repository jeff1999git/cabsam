import type { CustomerListQuery, UpdateCustomerStatusInput } from "@excelcabs/types";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";

import { customerService } from "@/services/customer.service";

import { type QueryDomain, queryKeys } from "./keys";

/** Disabling cancels bookings, which frees seats on trips and changes the dashboard's numbers. */
const CUSTOMER_WRITE_INVALIDATES = ["customers", "bookings", "trips", "dashboard"] as const satisfies readonly QueryDomain[];

/** Admin: customer accounts, newest first, with booking totals. */
export function useCustomers(query?: CustomerListQuery) {
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: () => customerService.list(query),
  });
}

export function useCustomer(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ""),
    queryFn: id ? () => customerService.get(id) : skipToken,
  });
}

/** `mutate({ id, input: { status: "disabled", reason } })` → `{ user, cancelledBookings }`. */
export function useSetCustomerStatus() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerStatusInput }) =>
      customerService.setStatus(id, input),
    meta: { invalidates: CUSTOMER_WRITE_INVALIDATES },
  });
}
