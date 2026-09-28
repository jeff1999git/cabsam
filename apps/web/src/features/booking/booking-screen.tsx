"use client";

import type { BookingDetails, SessionUser, TripSearchItem, TripUnbookableReason } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { DetailList } from "@excelcabs/ui/composites/detail-list";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, CircleCheck, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { TimeTile } from "@/components/common/time-tile";
import { useSession } from "@/hooks/use-session";
import { formatDateLong, formatTime } from "@/lib/datetime";
import { applyServiceError } from "@/lib/form";
import { formatMobile, formatRoute, formatSeats } from "@/lib/format";
import { type PassengerDetailsValues, passengerDetailsSchema } from "@/lib/schemas/booking";
import { useCreateBooking } from "@/queries/bookings";
import { useTripForBooking } from "@/queries/trips";
import { isServiceError } from "@/services/errors";

import { BOOKING_STEPS, BookingStepper } from "./booking-stepper";
import { homeHref } from "./search-params";

const UNBOOKABLE_MESSAGES: Record<TripUnbookableReason, string> = {
  full: "This trip is full.",
  departed: "This trip has already departed.",
  not_scheduled: "This trip is no longer running.",
  holiday: "There is no service on this date.",
};

const HEADING_CLASS = "text-2xl font-bold tracking-tight outline-none sm:text-3xl";

type FlowState =
  | { step: "passenger" }
  | { step: "review"; passenger: PassengerDetailsValues }
  | { step: "confirmed"; booking: BookingDetails };

const STEP_INDEX: Record<FlowState["step"], number> = {
  passenger: 1,
  review: 2,
  confirmed: BOOKING_STEPS.length,
};

function TripSummaryCard({ trip, changeable }: { trip: TripSearchItem; changeable: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <TimeTile time={trip.departureTime} />
        <div className="min-w-0">
          <p className="font-semibold">{formatDateLong(trip.date)}</p>
          <p className="truncate text-sm text-muted-foreground">
            <RouteLabel route={trip.route} />
          </p>
          <p className="text-sm text-muted-foreground">
            {trip.bus.name} · {formatSeats(trip.availableSeats)}
          </p>
        </div>
      </div>
      {changeable ? (
        <Button variant="soft" asChild className="sm:shrink-0">
          <Link
            href={homeHref({
              date: trip.date,
              from: trip.route.origin,
              to: trip.route.destination,
              trip: trip.id,
            })}
          >
            Change trip
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function BookingFlow({ trip, user }: { trip: TripSearchItem; user: SessionUser }) {
  const id = useId();
  const [flow, setFlow] = useState<FlowState>({ step: "passenger" });
  /** Message of a CONFLICT the service raised on confirm (trip full / departed / not running). */
  const [blocked, setBlocked] = useState<string | null>(null);
  const createBooking = useCreateBooking();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(flow.step);

  const form = useForm<PassengerDetailsValues>({
    resolver: zodResolver(passengerDetailsSchema),
    defaultValues: { passengerName: user.name, passengerMobile: user.mobile },
    mode: "onTouched",
  });

  useEffect(() => {
    if (previousStep.current === flow.step) return;
    previousStep.current = flow.step;
    headingRef.current?.focus();
  }, [flow.step]);

  const findAnotherHref = homeHref({
    date: trip.date,
    from: trip.route.origin,
    to: trip.route.destination,
  });

  async function confirmBooking(passenger: PassengerDetailsValues) {
    try {
      const booking = await createBooking.mutateAsync({ tripId: trip.id, ...passenger });
      setFlow({ step: "confirmed", booking });
    } catch (error) {
      // DUPLICATE_BOOKING carries a field error → back to the passenger step to fix it.
      if (applyServiceError(error, form.setError)) {
        setFlow({ step: "passenger" });
        return;
      }
      // TRIP_FULL / TRIP_DEPARTED / TRIP_NOT_SCHEDULED: already toasted; keep the reason on screen.
      if (isServiceError(error) && error.code === "CONFLICT") setBlocked(error.message);
    }
  }

  if (flow.step === "confirmed") {
    const { booking } = flow;
    return (
      <>
        <BookingStepper current={STEP_INDEX.confirmed} />
        <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-6 text-center shadow-card sm:p-10">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <CircleCheck className="size-8" />
          </div>
          <div>
            <h1 ref={headingRef} tabIndex={-1} className={HEADING_CLASS}>
              Booking Confirmed
            </h1>
            <p className="mt-1 text-muted-foreground">
              Your seat is reserved. Please be at the pickup point a few minutes before departure.
            </p>
          </div>
          <div className="w-full rounded-xl bg-primary-soft px-4 py-4">
            <p className={eyebrowClassName}>Booking ID</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {booking.id}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              {formatDateLong(booking.trip.date)} · {formatTime(booking.trip.departureTime)} ·{" "}
              {formatRoute(booking.trip.route)} · {booking.trip.bus.name}
            </p>
            <p className="mt-1">
              Passenger: {booking.passengerName} · {formatMobile(booking.passengerMobile)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="lg" asChild>
              <Link href={`/customer/bookings/${booking.id}`}>View Booking</Link>
            </Button>
            <Button size="lg" variant="soft" asChild>
              <Link href="/">Book another trip</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const unbookable = trip.bookability.bookable ? null : trip.bookability.reason;

  return (
    <>
      <BookingStepper current={STEP_INDEX[flow.step]} />
      <TripSummaryCard trip={trip} changeable />

      {unbookable ? (
        <Alert variant="warning">
          <CircleAlert />
          <AlertTitle>This trip can&apos;t be booked</AlertTitle>
          <AlertDescription>
            <p>{UNBOOKABLE_MESSAGES[unbookable]}</p>
            <Button variant="soft" size="sm" className="mt-1" asChild>
              <Link href={findAnotherHref}>Find another trip</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : flow.step === "passenger" ? (
        <form
          noValidate
          onSubmit={form.handleSubmit((passenger) => setFlow({ step: "review", passenger }))}
          className="rounded-xl border bg-card p-5 shadow-card sm:p-6"
        >
          <h1 ref={headingRef} tabIndex={-1} className={HEADING_CLASS}>
            Passenger details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Booking for someone else? Enter their details.
          </p>
          <FieldGroup className="mt-6">
            <Controller
              name="passengerName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-name`} className={eyebrowClassName}>
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-name`}
                    icon={<UserRound />}
                    autoComplete="name"
                    aria-invalid={fieldState.invalid}
                    className="h-12 md:h-12"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="passengerMobile"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-mobile`} className={eyebrowClassName}>
                    Mobile Number
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-mobile`}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    icon={<Phone />}
                    aria-invalid={fieldState.invalid}
                    className="h-12 md:h-12"
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <div className="mt-6 flex justify-end">
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Continue
              <ArrowRight />
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
          <h1 ref={headingRef} tabIndex={-1} className={HEADING_CLASS}>
            Review your booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Check the details before confirming.</p>
          <DetailList
            columns={2}
            className="mt-6"
            items={[
              { label: "Date", value: formatDateLong(trip.date) },
              { label: "Time", value: formatTime(trip.departureTime) },
              { label: "Route", value: <RouteLabel route={trip.route} /> },
              { label: "Bus", value: `${trip.bus.name} · ${trip.bus.registrationNumber}` },
              {
                label: "Passenger",
                value: `${flow.passenger.passengerName} · ${formatMobile(flow.passenger.passengerMobile)}`,
                fullWidth: true,
              },
            ]}
          />
          {blocked ? (
            <Alert variant="destructive" className="mt-6">
              <CircleAlert />
              <AlertTitle>Booking not possible</AlertTitle>
              <AlertDescription>{blocked}</AlertDescription>
            </Alert>
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="soft"
              size="lg"
              disabled={createBooking.isPending}
              onClick={() => setFlow({ step: "passenger" })}
            >
              Edit
            </Button>
            {blocked ? (
              <Button size="lg" variant="soft" asChild>
                <Link href={findAnotherHref}>Find another trip</Link>
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              loading={createBooking.isPending}
              disabled={blocked !== null}
              onClick={() => void confirmBooking(flow.passenger)}
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function BookingScreenSkeleton() {
  return (
    <>
      <BookingStepper current={1} />
      <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
        <Skeleton className="size-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </>
  );
}

/** `/book/[tripId]`: passenger details → review → confirmation (the RoleGuard ensures a customer). */
export function BookingScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { status, session } = useSession();
  const trip = useTripForBooking(tripId);

  let content;
  if (trip.data && status === "authenticated") {
    content = <BookingFlow key={trip.data.id} trip={trip.data} user={session.user} />;
  } else if (trip.isError) {
    content =
      isServiceError(trip.error) && trip.error.code === "NOT_FOUND" ? (
        <>
          <BookingStepper current={1} />
          <Alert variant="warning">
            <CircleAlert />
            <AlertTitle>Trip not found</AlertTitle>
            <AlertDescription>
              <p>This trip may have been removed. Search again to find another one.</p>
              <Button variant="soft" size="sm" className="mt-1" asChild>
                <Link href="/">Find another trip</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <QueryError error={trip.error} onRetry={() => void trip.refetch()} />
      );
  } else {
    content = <BookingScreenSkeleton />;
  }

  return <div className="flex flex-col gap-6 sm:gap-8">{content}</div>;
}
