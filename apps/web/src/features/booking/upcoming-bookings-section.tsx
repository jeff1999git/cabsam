"use client";

import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { StatusBadge } from "@excelcabs/ui/composites/status-badge";
import { Ticket } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { QueryError } from "@/components/common/query-error";
import { BookingCard, BookingCardSkeleton } from "@/features/customer/booking-card";
import { pluralize } from "@/lib/format";
import { useMyBookings } from "@/queries/bookings";

/** How many upcoming bookings the home page previews before "View all". */
const PREVIEW_COUNT = 3;

/**
 * "My Upcoming Bookings" on the home page (signed-in customers). Renders nothing when there are
 * no upcoming bookings.
 */
export function UpcomingBookingsSection() {
  const headingId = useId();
  const bookings = useMyBookings({ scope: "upcoming" });

  if (bookings.isSuccess && bookings.data.length === 0) return null;

  const total = bookings.data?.length ?? 0;

  return (
    <section aria-labelledby={headingId} aria-busy={bookings.isPending} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Ticket className="size-5 text-primary" aria-hidden="true" />
          My Upcoming Bookings
        </h2>
        {bookings.isPending ? (
          <Skeleton className="h-6 w-24 rounded-full" />
        ) : (
          <div className="flex items-center gap-3">
            <StatusBadge tone="info">{pluralize(total, "Active Trip")}</StatusBadge>
            <Link href="/customer" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
        )}
      </div>
      {bookings.isError ? (
        <QueryError error={bookings.error} onRetry={() => void bookings.refetch()} />
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.data ? (
            bookings.data.slice(0, PREVIEW_COUNT).map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <BookingCardSkeleton />
          )}
        </ul>
      )}
    </section>
  );
}
