"use client";

import type { ISODate, TripWithPassengers } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@excelcabs/ui/components/card";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { DetailList } from "@excelcabs/ui/composites/detail-list";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { ArrowLeft, Ban, CircleCheck, Clock, Play, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { TripStatusBadge } from "@/components/status/trip-status-badge";
import { formatDateLong, formatDuration, formatInstant, formatTime, today } from "@/lib/datetime";
import { formatOccupancy, formatRoute, pluralize } from "@/lib/format";
import { useCompleteTrip, useStartTrip, useTripPassengers } from "@/queries/trips";
import { isServiceError } from "@/services/errors";

import { PassengerList } from "./passenger-list";

type TripAction = "start" | "complete";

function BackLink() {
  return (
    <Link
      href="/driver"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Today&apos;s trips
    </Link>
  );
}

/** Outcome banner for trips that are no longer waiting to start. */
function StatusAlert({ trip }: { trip: TripWithPassengers }) {
  switch (trip.status) {
    case "cancelled":
      return (
        <Alert variant="destructive">
          <Ban />
          <AlertTitle>Trip cancelled</AlertTitle>
          <AlertDescription>
            <p>{trip.cancellationReason ?? "No reason was given."}</p>
            {trip.cancelledAt ? <p>Cancelled {formatInstant(trip.cancelledAt)}</p> : null}
          </AlertDescription>
        </Alert>
      );
    case "completed":
      return (
        <Alert variant="success">
          <CircleCheck />
          <AlertTitle>Trip completed</AlertTitle>
          {trip.completedAt ? (
            <AlertDescription>Completed {formatInstant(trip.completedAt)}</AlertDescription>
          ) : null}
        </Alert>
      );
    case "in_progress":
      return trip.startedAt ? (
        <Alert variant="info">
          <Clock />
          <AlertTitle>Trip in progress</AlertTitle>
          <AlertDescription>Started {formatInstant(trip.startedAt)}</AlertDescription>
        </Alert>
      ) : null;
    case "scheduled":
      return null;
  }
}

/** Why a scheduled trip cannot be started right now (the service's `canStart` is false). */
function scheduledNote(trip: TripWithPassengers, todayDate: ISODate): string {
  if (trip.date > todayDate) return `You can start this trip on ${formatDateLong(trip.date)}.`;
  if (trip.date < todayDate) {
    return `This trip was scheduled for ${formatDateLong(trip.date)} and was not started.`;
  }
  return "Complete your trip in progress before starting this one.";
}

/** Start / Complete in a bar that sticks to the bottom on phones and sits in the flow from `md`. */
function TripActions({ trip, todayDate }: { trip: TripWithPassengers; todayDate: ISODate }) {
  const [confirming, setConfirming] = useState<TripAction | null>(null);
  const startTrip = useStartTrip();
  const completeTrip = useCompleteTrip();
  const { canStart, canComplete } = trip.permissions;

  async function start() {
    await startTrip.mutateAsync(trip.id);
    toast.success("Trip started");
  }

  async function complete() {
    await completeTrip.mutateAsync(trip.id);
    toast.success("Trip completed");
  }

  if (!canStart && !canComplete) {
    if (trip.status !== "scheduled") return null;
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {scheduledNote(trip, todayDate)}
      </p>
    );
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-2 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:flex-row md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {canStart ? (
          <Button
            size="lg"
            className="w-full md:w-auto"
            loading={startTrip.isPending}
            onClick={() => setConfirming("start")}
          >
            <Play />
            Start Trip
          </Button>
        ) : null}
        {canComplete ? (
          <Button
            size="lg"
            className="w-full md:w-auto"
            loading={completeTrip.isPending}
            onClick={() => setConfirming("complete")}
          >
            <CircleCheck />
            Complete Trip
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming === "start"}
        onOpenChange={(open) => setConfirming(open ? "start" : null)}
        title="Start this trip?"
        description={`${formatTime(trip.departureTime)} ${formatRoute(trip.route)} with ${pluralize(trip.bookedSeats, "passenger")}. The trip will show as in progress.`}
        confirmLabel="Start trip"
        onConfirm={start}
      />
      <ConfirmDialog
        open={confirming === "complete"}
        onOpenChange={(open) => setConfirming(open ? "complete" : null)}
        title="Complete this trip?"
        description="The trip will be marked completed and its passengers as travelled."
        confirmLabel="Complete trip"
        onConfirm={complete}
      />
    </>
  );
}

function TripDetail({ trip, todayDate }: { trip: TripWithPassengers; todayDate: ISODate }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackLink />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <span>{formatTime(trip.departureTime)}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <RouteLabel route={trip.route} />
          </h1>
          <TripStatusBadge status={trip.status} />
        </div>
        <p className="mt-1 text-muted-foreground">{formatDateLong(trip.date)}</p>
      </div>

      <StatusAlert trip={trip} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Date", value: formatDateLong(trip.date) },
                {
                  label: "Departure → est. arrival",
                  value: `${formatTime(trip.departureTime)} → ${formatTime(trip.arrivalTime)}`,
                },
                { label: "Duration", value: formatDuration(trip.durationMinutes) },
                { label: "Route", value: <RouteLabel route={trip.route} /> },
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
                { label: "Capacity", value: pluralize(trip.capacity, "seat") },
                {
                  label: "Booked",
                  value: `${formatOccupancy(trip.bookedSeats, trip.capacity)} booked`,
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden="true" />
              Passengers ({trip.passengers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PassengerList passengers={trip.passengers} />
          </CardContent>
        </Card>
      </div>

      <TripActions trip={trip} todayDate={todayDate} />
    </div>
  );
}

function TripDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-56 rounded-xl sm:col-span-2" />
      </div>
    </div>
  );
}

/** `/driver/trips/[tripId]`: trip, bus and passengers with tap-to-call, plus Start / Complete. */
export function DriverTripScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const [todayDate] = useState(today);
  const trip = useTripPassengers(tripId);

  if (trip.isPending) return <TripDetailSkeleton />;

  if (trip.isError) {
    const notFound = isServiceError(trip.error) && trip.error.code === "NOT_FOUND";
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        {notFound ? (
          <EmptyState
            icon={<SearchX />}
            title="Trip not found"
            description="This trip does not exist or is not assigned to you."
            action={
              <Button asChild>
                <Link href="/driver">Back to today&apos;s trips</Link>
              </Button>
            }
          />
        ) : (
          <QueryError
            error={trip.error}
            onRetry={() => void trip.refetch()}
            retrying={trip.isFetching}
          />
        )}
      </div>
    );
  }

  return <TripDetail trip={trip.data} todayDate={todayDate} />;
}
