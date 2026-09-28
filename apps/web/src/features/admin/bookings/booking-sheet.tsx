"use client";

import type { BookingDetails, CancellationSource } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@excelcabs/ui/components/sheet";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { DetailList, type DetailListItem } from "@excelcabs/ui/composites/detail-list";
import { Ban, CalendarDays, Phone } from "lucide-react";
import Link from "next/link";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { BookingStatusBadge } from "@/components/status/booking-status-badge";
import { TripStatusBadge } from "@/components/status/trip-status-badge";
import { tripsHref } from "@/features/admin/trips/trips-search-params";
import { formatDateLong, formatDuration, formatInstant, formatTime } from "@/lib/datetime";
import { formatMobile, telHref } from "@/lib/format";
import { useBooking } from "@/queries/bookings";

const CANCELLATION_SOURCE_LABEL: Record<CancellationSource, string> = {
  customer: "by the customer",
  admin: "by admin",
  trip_cancelled: "trip cancelled",
  holiday: "holiday",
};

interface BookingSheetProps {
  /** Row data shown until the detail query resolves, and kept while the sheet closes. */
  booking: BookingDetails | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (booking: BookingDetails) => void;
}

function CallLink({ name, mobile }: { name: string; mobile: string }) {
  return (
    <a
      href={telHref(mobile)}
      aria-label={`Call ${name}`}
      className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
    >
      <Phone aria-hidden="true" className="size-3.5" />
      {formatMobile(mobile)}
    </a>
  );
}

function bookingItems(booking: BookingDetails): DetailListItem[] {
  const { trip } = booking;
  const items: DetailListItem[] = [
    { label: "Passenger", value: booking.passengerName },
    { label: "Mobile", value: <CallLink name={booking.passengerName} mobile={booking.passengerMobile} /> },
    { label: "Trip date", value: formatDateLong(trip.date) },
    {
      label: "Departure",
      value: `${formatTime(trip.departureTime)} → ${formatTime(trip.arrivalTime)} (${formatDuration(trip.durationMinutes)})`,
    },
    { label: "Route", value: <RouteLabel route={trip.route} compact /> },
    {
      label: "Bus",
      value: (
        <>
          {trip.bus.name} <span className="font-mono text-xs text-muted-foreground">{trip.bus.registrationNumber}</span>
        </>
      ),
    },
    {
      label: "Driver",
      value: (
        <>
          {trip.driver.name} · <CallLink name={trip.driver.name} mobile={trip.driver.mobile} />
        </>
      ),
    },
    { label: "Trip status", value: <TripStatusBadge status={trip.status} /> },
    { label: "Booked on", value: formatInstant(booking.createdAt) },
    {
      label: "Booked by",
      value: (
        <>
          {booking.bookedBy.name} <span className="text-muted-foreground">({booking.bookedBy.email})</span>
        </>
      ),
    },
  ];
  if (booking.status === "completed" && booking.completedAt) {
    items.push({ label: "Completed", value: formatInstant(booking.completedAt) });
  }
  if (booking.status === "cancelled" && booking.cancelledAt) {
    const source = booking.cancellationSource ? ` · ${CANCELLATION_SOURCE_LABEL[booking.cancellationSource]}` : "";
    items.push({ label: "Cancelled", value: `${formatInstant(booking.cancelledAt)}${source}` });
    if (booking.cancellationReason) {
      items.push({ label: "Reason", value: booking.cancellationReason, fullWidth: true });
    }
  }
  return items;
}

function SheetSkeleton() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Loading booking</SheetTitle>
        <SheetDescription className="sr-only">Booking details are loading</SheetDescription>
      </SheetHeader>
      <SheetBody aria-busy="true" className="space-y-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        ))}
      </SheetBody>
    </>
  );
}

/** Right-hand panel with everything about one booking and the admin's cancel action. */
export function BookingSheet({ booking: row, open, onOpenChange, onCancel }: BookingSheetProps) {
  const detail = useBooking(row?.id);
  const booking = detail.data ?? row;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {booking ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{booking.id}</SheetTitle>
              <SheetDescription>
                {formatDateLong(booking.trip.date)} · {formatTime(booking.trip.departureTime)} ·{" "}
                {booking.trip.bus.name}
              </SheetDescription>
              <div>
                <BookingStatusBadge status={booking.status} />
              </div>
            </SheetHeader>
            <SheetBody>
              <DetailList items={bookingItems(booking)} columns={2} />
            </SheetBody>
            <SheetFooter className="sm:flex-row sm:justify-end">
              <Button variant="soft" asChild>
                <Link href={tripsHref({ date: booking.trip.date, tripId: booking.trip.id })}>
                  <CalendarDays />
                  View trip
                </Link>
              </Button>
              {booking.canCancel ? (
                <Button variant="destructive" onClick={() => onCancel(booking)}>
                  <Ban />
                  Cancel booking
                </Button>
              ) : null}
            </SheetFooter>
          </>
        ) : detail.isError ? (
          <>
            <SheetHeader>
              <SheetTitle>Booking</SheetTitle>
              <SheetDescription className="sr-only">Booking details</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <QueryError error={detail.error} onRetry={() => void detail.refetch()} retrying={detail.isFetching} />
            </SheetBody>
          </>
        ) : (
          <SheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}
