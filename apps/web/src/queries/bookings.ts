import type {
  BookingDetails,
  BookingListQuery,
  CancelBookingInput,
  MyBookingsQuery,
} from "@excelcabs/types";
import {
  keepPreviousData,
  type QueryClient,
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { bookingService } from "@/services/booking.service";

import { type QueryDomain, queryKeys } from "./keys";

const BOOKING_WRITE_INVALIDATES = ["bookings", "trips", "dashboard"] as const satisfies readonly QueryDomain[];

function cacheDetail(queryClient: QueryClient, booking: BookingDetails): void {
  queryClient.setQueryData(queryKeys.bookings.detail(booking.id), booking);
}

/** Customer: own bookings by scope (default `all`). */
export function useMyBookings(query?: MyBookingsQuery) {
  return useQuery({
    queryKey: queryKeys.bookings.mine(query),
    queryFn: () => bookingService.listMine(query),
  });
}

/** Customer (own) or admin. */
export function useBooking(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id ?? ""),
    queryFn: id ? () => bookingService.get(id) : skipToken,
  });
}

/** Admin: paginated, filtered list; keeps the current page visible while the next one loads. */
export function useBookings(query: BookingListQuery) {
  return useQuery({
    queryKey: queryKeys.bookings.list(query),
    queryFn: () => bookingService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingService.create,
    meta: { invalidates: BOOKING_WRITE_INVALIDATES },
    onSuccess: (booking) => cacheDetail(queryClient, booking),
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: CancelBookingInput }) =>
      bookingService.cancel(id, input),
    meta: { invalidates: BOOKING_WRITE_INVALIDATES },
    onSuccess: (booking) => cacheDetail(queryClient, booking),
  });
}
