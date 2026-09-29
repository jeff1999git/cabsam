"use client";

import type { ISODate, TripSearchItem } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Field, FieldError, FieldLabel } from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowRight, BusFront, CalendarDays, CircleDot, Info, MapPin, Search } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { formatTime } from "@/lib/datetime";
import { formatRoute } from "@/lib/format";
import { type StopPointsValues, stopPointsSchema } from "@/lib/schemas/booking";

/** Search fields are taller than regular controls (reference look). */
const TALL_INPUT = "h-12 md:h-12";
const TALL_SELECT = "[&>select]:h-12";

type StopErrors = Partial<Record<keyof StopPointsValues, string>>;

type StopsValidation = { ok: true; values: StopPointsValues } | { ok: false; errors: StopErrors };

function validateStops(stops: StopPointsValues): StopsValidation {
  const parsed = stopPointsSchema.safeParse(stops);
  if (parsed.success) return { ok: true, values: parsed.data };
  const errors: StopErrors = {};
  for (const issue of parsed.error.issues) {
    const [field] = issue.path;
    if ((field === "pickupPoint" || field === "dropPoint") && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

const NO_ERRORS: StopErrors = {};

/** Bus / Time option shown when there is no bookable trip to pick. */
const TRIP_PLACEHOLDER = {
  loading: "Loading trips…",
  error: "Trips unavailable",
  ready: "No trips to book",
} as const;

interface TripSearchFormBaseProps {
  date: ISODate;
  /** Earliest selectable date (today). */
  minDate: ISODate;
  onDateChange: (date: ISODate) => void;
  /** Pickup / drop exactly as typed (not trimmed). */
  stops: StopPointsValues;
  onStopsChange: (stops: StopPointsValues) => void;
  /** A pickup / drop input lost focus. */
  onStopsBlur?: () => void;
}

type TripSearchFormProps = TripSearchFormBaseProps &
  (
    | {
        /** Home: adds the Bus / Time picker and continues to the selected trip. */
        mode: "select";
        bookableTrips: readonly TripSearchItem[];
        /** State of the date's trip search (the Bus / Time options). */
        tripsStatus: "loading" | "error" | "ready";
        selectedTripId: string | null;
        onSelectTrip: (tripId: string) => void;
        /** Called with the validated (trimmed) stops. */
        onContinue: (stops: StopPointsValues) => void;
      }
    | {
        /** Dashboard: Date / Pickup / Drop, then navigates to the home search. */
        mode: "navigate";
        /** Called with the validated (trimmed) stops. */
        onSubmit: (stops: StopPointsValues) => void;
      }
  );

/** "Bus 2 · 7:00 AM · Shakthan Stand → SmartCity" */
function tripOptionLabel(trip: TripSearchItem): string {
  return `${trip.bus.name} · ${formatTime(trip.departureTime)} · ${formatRoute(trip.route)}`;
}

/**
 * "Book Your Trip" card: date, free-text pickup / drop and (home) the bus trip. Pickup and drop are
 * validated on submit; errors then follow the typing until they are fixed.
 */
export function TripSearchForm(props: TripSearchFormProps) {
  const { date, minDate, onDateChange, stops, onStopsChange, onStopsBlur } = props;
  const id = useId();
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const validation = validateStops(stops);
  const errors = submitted && !validation.ok ? validation.errors : NO_ERRORS;

  const helperId = `${id}-helper`;
  const pickupErrorId = `${id}-pickup-error`;
  const dropErrorId = `${id}-drop-error`;

  function describedBy(errorId: string, error: string | undefined): string {
    return error ? `${errorId} ${helperId}` : helperId;
  }

  function changeDate(value: string) {
    // Native date inputs report "" while a date is being typed; keep the current one until valid.
    if (value) onDateChange(value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.ok) {
      setSubmitted(true);
      (validation.errors.pickupPoint ? pickupRef : dropRef).current?.focus();
      return;
    }
    if (props.mode === "select") props.onContinue(validation.values);
    else props.onSubmit(validation.values);
  }

  const noBookableTrips =
    props.mode === "select" && props.tripsStatus === "ready" && props.bookableTrips.length === 0;
  const submitDisabled = props.mode === "select" && props.selectedTripId === null;

  return (
    <div className="flex flex-col gap-3">
      <form noValidate onSubmit={submit} className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            props.mode === "select" ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
          )}
        >
          <Field>
            <FieldLabel htmlFor={`${id}-date`} className={eyebrowClassName}>
              Select date
            </FieldLabel>
            <Input
              id={`${id}-date`}
              type="date"
              icon={<CalendarDays />}
              min={minDate}
              value={date}
              onChange={(event) => changeDate(event.target.value)}
              className={TALL_INPUT}
            />
          </Field>

          <Field data-invalid={Boolean(errors.pickupPoint)}>
            <FieldLabel htmlFor={`${id}-pickup`} className={eyebrowClassName}>
              Pickup point
            </FieldLabel>
            <Input
              ref={pickupRef}
              id={`${id}-pickup`}
              name="pickup"
              icon={<CircleDot />}
              placeholder="e.g. Aluva Metro"
              enterKeyHint="next"
              value={stops.pickupPoint}
              onChange={(event) => onStopsChange({ ...stops, pickupPoint: event.target.value })}
              onBlur={onStopsBlur}
              aria-invalid={Boolean(errors.pickupPoint)}
              aria-describedby={describedBy(pickupErrorId, errors.pickupPoint)}
              className={TALL_INPUT}
            />
            <FieldError id={pickupErrorId}>{errors.pickupPoint}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.dropPoint)}>
            <FieldLabel htmlFor={`${id}-drop`} className={eyebrowClassName}>
              Drop point
            </FieldLabel>
            <Input
              ref={dropRef}
              id={`${id}-drop`}
              name="drop"
              icon={<MapPin />}
              placeholder="e.g. Kakkanad"
              enterKeyHint={props.mode === "select" ? "next" : "search"}
              value={stops.dropPoint}
              onChange={(event) => onStopsChange({ ...stops, dropPoint: event.target.value })}
              onBlur={onStopsBlur}
              aria-invalid={Boolean(errors.dropPoint)}
              aria-describedby={describedBy(dropErrorId, errors.dropPoint)}
              className={TALL_INPUT}
            />
            <FieldError id={dropErrorId}>{errors.dropPoint}</FieldError>
          </Field>

          {props.mode === "select" ? (
            <Field>
              <FieldLabel htmlFor={`${id}-trip`} className={eyebrowClassName}>
                Select bus / time
              </FieldLabel>
              <NativeSelect
                id={`${id}-trip`}
                icon={<BusFront />}
                value={props.selectedTripId ?? ""}
                onChange={(event) => props.onSelectTrip(event.target.value)}
                disabled={props.bookableTrips.length === 0}
                className={TALL_SELECT}
              >
                {props.bookableTrips.length > 0 ? (
                  props.bookableTrips.map((trip) => (
                    <NativeSelectOption key={trip.id} value={trip.id}>
                      {tripOptionLabel(trip)}
                    </NativeSelectOption>
                  ))
                ) : (
                  <NativeSelectOption value="">{TRIP_PLACEHOLDER[props.tripsStatus]}</NativeSelectOption>
                )}
              </NativeSelect>
            </Field>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-end">
          {noBookableTrips ? (
            <p className="text-sm text-muted-foreground sm:mr-auto">No bookable trips on this date</p>
          ) : null}
          <Button type="submit" size="lg" disabled={submitDisabled} className="w-full sm:w-auto">
            {props.mode === "select" ? (
              <>
                Continue
                <ArrowRight />
              </>
            ) : (
              <>
                <Search />
                Find trips
              </>
            )}
          </Button>
        </div>
      </form>
      <p id={helperId} className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Board or get off anywhere along the route — just type the place.
      </p>
    </div>
  );
}
