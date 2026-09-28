"use client";

import type { BookingDetails } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import Link from "next/link";

import { DateTile } from "@/components/common/date-tile";
import { RouteLabel } from "@/components/common/route-label";
import { BookingStatusBadge } from "@/components/status/booking-status-badge";
import { formatTime } from "@/lib/datetime";

import { CancelBookingButton } from "./cancel-booking-button";

/** Booking row (DATE TILE · time + bus + status · route) for the dashboard and home page lists. */
export function BookingCard({ booking }: { booking: BookingDetails }) {
  const { trip } = booking;

  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <DateTile date={trip.date} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">
              {formatTime(trip.departureTime)} · {trip.bus.name}
            </p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            <RouteLabel route={trip.route} />
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-mono">{booking.id}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{booking.passengerName}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">
        <Button variant="soft" asChild>
          <Link href={`/customer/bookings/${booking.id}`}>View</Link>
        </Button>
        {booking.canCancel ? (
          <CancelBookingButton booking={booking} variant="ghost" className="text-muted-foreground" />
        ) : null}
      </div>
    </li>
  );
}

export function BookingCardSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <Skeleton className="size-16 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-44 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
        <Skeleton className="h-3 w-36 max-w-full" />
      </div>
      <Skeleton className="hidden h-10 w-20 sm:block" />
    </li>
  );
}
