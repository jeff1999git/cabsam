"use client";

import type { BookingDetails } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@excelcabs/ui/components/card";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { DetailList, type DetailListItem } from "@excelcabs/ui/composites/detail-list";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { ArrowLeft, Ticket } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { BookingStatusBadge } from "@/components/status/booking-status-badge";
import { formatDateLong, formatDuration, formatInstant, formatTime } from "@/lib/datetime";
import { formatMobile } from "@/lib/format";
import { useBooking } from "@/queries/bookings";
import { isServiceError } from "@/services/errors";

import { CancelBookingButton } from "./cancel-booking-button";

function bookingItems(booking: BookingDetails): DetailListItem[] {
  const items: DetailListItem[] = [
    { label: "Booked on", value: formatInstant(booking.createdAt) },
    { label: "Booked by", value: booking.bookedBy.name },
  ];
  if (booking.cancelledAt) {
    items.push({ label: "Cancelled on", value: formatInstant(booking.cancelledAt) });
  }
  if (booking.cancellationReason) {
    items.push({ label: "Reason", value: booking.cancellationReason, fullWidth: true });
  }
  return items;
}

function BookingDetail({ booking }: { booking: BookingDetails }) {
  const { trip } = booking;

  return (
    <>
      <div>
        <Link
          href="/customer"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          My bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Booking <span className="font-mono">{booking.id}</span>
          </h1>
          <BookingStatusBadge status={booking.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              columns={2}
              items={[
                { label: "Date", value: formatDateLong(trip.date) },
                {
                  label: "Departure → est. arrival",
                  value: `${formatTime(trip.departureTime)} → ${formatTime(trip.arrivalTime)}`,
                },
                { label: "Route", value: <RouteLabel route={trip.route} /> },
                { label: "Duration", value: formatDuration(trip.durationMinutes) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bus</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Bus", value: trip.bus.name },
                {
                  label: "Registration",
                  value: <span className="font-mono">{trip.bus.registrationNumber}</span>,
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Driver</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList items={[{ label: "Name", value: trip.driver.name }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Passenger</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Name", value: booking.passengerName },
                { label: "Mobile", value: formatMobile(booking.passengerMobile) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList items={bookingItems(booking)} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {booking.canCancel ? (
          <CancelBookingButton
            booking={booking}
            size="lg"
            variant="outline"
            className="border-destructive/30 text-destructive hover:bg-destructive-soft hover:text-destructive"
          >
            Cancel booking
          </CancelBookingButton>
        ) : null}
        <Button size="lg" asChild>
          <Link href="/">Book another trip</Link>
        </Button>
      </div>
    </>
  );
}

function BookingDetailSkeleton() {
  return (
    <>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-xl sm:col-span-2" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </>
  );
}

/** `/customer/bookings/[bookingId]`: one booking with its trip, bus, driver and passenger. */
export function BookingDetailScreen() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const booking = useBooking(bookingId);

  let content;
  if (booking.data) {
    content = <BookingDetail booking={booking.data} />;
  } else if (booking.isError) {
    content =
      isServiceError(booking.error) && booking.error.code === "NOT_FOUND" ? (
        <EmptyState
          icon={<Ticket />}
          title="Booking not found"
          description="This booking doesn't exist or belongs to another account."
          action={
            <Button asChild>
              <Link href="/customer">Back to my bookings</Link>
            </Button>
          }
        />
      ) : (
        <QueryError error={booking.error} onRetry={() => void booking.refetch()} />
      );
  } else {
    content = <BookingDetailSkeleton />;
  }

  return <div className="flex flex-col gap-6 sm:gap-8">{content}</div>;
}
