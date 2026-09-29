"use client";

import type { TripDetails, TripPassenger, TripWithPassengers } from "@excelcabs/types";
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
import { Ban, Pencil, Phone } from "lucide-react";
import { useId } from "react";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { TripStatusBadge } from "@/components/status/trip-status-badge";
import { StopsLabel } from "@/components/common/stops-label";
import { formatDateLong, formatDuration, formatInstant, formatTime } from "@/lib/datetime";
import { formatMobile, formatOccupancy, formatSeats, telHref } from "@/lib/format";
import { useTripPassengers } from "@/queries/trips";

import { TRIP_DIRECTION_LABEL } from "./trip-route";

interface TripSheetProps {
  /** Kept while the sheet closes so its content does not vanish mid-animation. */
  tripId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (trip: TripDetails) => void;
  onCancel: (trip: TripDetails) => void;
}

function tripItems(trip: TripWithPassengers): DetailListItem[] {
  const items: DetailListItem[] = [
    { label: "Date", value: formatDateLong(trip.date) },
    {
      label: "Departure",
      value: `${formatTime(trip.departureTime)} → ${formatTime(trip.arrivalTime)} (${formatDuration(trip.durationMinutes)})`,
    },
    { label: "Route", value: <RouteLabel route={trip.route} compact /> },
    { label: "Direction", value: TRIP_DIRECTION_LABEL[trip.direction] },
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
          {trip.driver.name} ·{" "}
          <a
            href={telHref(trip.driver.mobile)}
            aria-label={`Call ${trip.driver.name}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {formatMobile(trip.driver.mobile)}
          </a>
        </>
      ),
    },
    {
      label: "Bookings",
      value: `${formatOccupancy(trip.bookedSeats, trip.capacity)} · ${formatSeats(trip.availableSeats)}`,
    },
  ];
  if (trip.startedAt) items.push({ label: "Started", value: formatInstant(trip.startedAt) });
  if (trip.completedAt) items.push({ label: "Completed", value: formatInstant(trip.completedAt) });
  if (trip.cancelledAt) {
    items.push({ label: "Cancelled", value: formatInstant(trip.cancelledAt) });
    if (trip.cancellationReason) {
      items.push({ label: "Reason", value: trip.cancellationReason, fullWidth: true });
    }
  }
  return items;
}

/** Name, booking ID and pickup → drop; the stops take the full row width on phones. */
function PassengerRow({ passenger }: { passenger: TripPassenger }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{passenger.name}</p>
        <p className="font-mono text-xs text-muted-foreground">{passenger.bookingId}</p>
      </div>
      <a
        href={telHref(passenger.mobile)}
        aria-label={`Call ${passenger.name}`}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:row-span-2"
      >
        <Phone aria-hidden="true" className="size-4" />
        <span className="tabular-nums">{formatMobile(passenger.mobile)}</span>
      </a>
      <StopsLabel
        pickupPoint={passenger.pickupPoint}
        dropPoint={passenger.dropPoint}
        className="col-span-2 text-muted-foreground sm:col-span-1"
      />
    </li>
  );
}

function SheetSkeleton() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Loading trip</SheetTitle>
        <SheetDescription className="sr-only">Trip details are loading</SheetDescription>
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

/** Right-hand panel: trip details, its passengers with tap-to-call links, and edit / cancel. */
export function TripSheet({ tripId, open, onOpenChange, onEdit, onCancel }: TripSheetProps) {
  const passengersHeadingId = useId();
  const query = useTripPassengers(tripId);
  const trip = query.data;
  const showFooter = trip !== undefined && (trip.permissions.canEdit || trip.permissions.canCancel);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {trip ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {formatTime(trip.departureTime)}
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <RouteLabel route={trip.route} />
              </SheetTitle>
              <SheetDescription>
                {formatDateLong(trip.date)} · {trip.bus.name}
              </SheetDescription>
              <div>
                <TripStatusBadge status={trip.status} />
              </div>
            </SheetHeader>
            <SheetBody className="space-y-6">
              <DetailList items={tripItems(trip)} columns={2} />
              <section aria-labelledby={passengersHeadingId}>
                <h3 id={passengersHeadingId} className="text-sm font-semibold tracking-tight">
                  Passengers ({trip.passengers.length})
                </h3>
                {trip.passengers.length > 0 ? (
                  <ul className="mt-1 divide-y">
                    {trip.passengers.map((passenger) => (
                      <PassengerRow key={passenger.bookingId} passenger={passenger} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No passengers booked.</p>
                )}
              </section>
            </SheetBody>
            {showFooter ? (
              <SheetFooter className="sm:flex-row sm:justify-end">
                {trip.permissions.canEdit ? (
                  <Button variant="soft" onClick={() => onEdit(trip)}>
                    <Pencil />
                    Edit trip
                  </Button>
                ) : null}
                {trip.permissions.canCancel ? (
                  <Button variant="destructive" onClick={() => onCancel(trip)}>
                    <Ban />
                    Cancel trip
                  </Button>
                ) : null}
              </SheetFooter>
            ) : null}
          </>
        ) : query.isError ? (
          <>
            <SheetHeader>
              <SheetTitle>Trip</SheetTitle>
              <SheetDescription className="sr-only">Trip details</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <QueryError error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
            </SheetBody>
          </>
        ) : (
          <SheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}
