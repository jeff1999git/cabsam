"use client";

import type { ISODate, TripSearchItem } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Input } from "@excelcabs/ui/components/input";
import { Label } from "@excelcabs/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import {
  ArrowLeftRight,
  ArrowRight,
  BusFront,
  CalendarDays,
  CircleDot,
  MapPin,
  Search,
} from "lucide-react";
import { type FormEvent, useId } from "react";

import { formatTime } from "@/lib/datetime";
import { pluralize } from "@/lib/format";
import type { RouteNetwork } from "@/queries/routes";

import { canSwapStops, type TripSearchState } from "./search-params";

/** Search fields are taller than regular controls (reference look). */
const TALL_INPUT = "h-12 md:h-12";
const TALL_SELECT = "[&>select]:h-12";

interface TripSearchFormBaseProps {
  /** Resolved search; `null` while the route network loads or when no route is active. */
  value: TripSearchState | null;
  network: RouteNetwork | undefined;
  /** Earliest selectable date (today). */
  minDate: ISODate;
  onChange: (next: TripSearchState) => void;
}

type TripSearchFormProps = TripSearchFormBaseProps &
  (
    | {
        /** Home: adds the Bus / Time picker and continues to the selected trip. */
        mode: "select";
        bookableTrips: readonly TripSearchItem[];
        tripsLoading: boolean;
        selectedTripId: string | null;
        onSelectTrip: (tripId: string) => void;
        onContinue: () => void;
      }
    | {
        /** Dashboard: Date / Pickup / Destination, then navigates to the home search. */
        mode: "navigate";
        onSubmit: () => void;
      }
  );

function tripOptionLabel(trip: TripSearchItem): string {
  return `${formatTime(trip.departureTime)} — ${trip.bus.name} · ${pluralize(trip.availableSeats, "seat")}`;
}

export function TripSearchForm(props: TripSearchFormProps) {
  const { value, network, minDate, onChange } = props;
  const id = useId();
  const ready = value !== null && network !== undefined;
  const destinations = value && network ? (network.destinationsByOrigin[value.from] ?? []) : [];
  const swappable = value !== null && network !== undefined && canSwapStops(network, value);
  const noRoutes = network !== undefined && network.origins.length === 0;

  function changeDate(date: string) {
    // Native date inputs report "" while a date is being typed; keep the current one until valid.
    if (value && date) onChange({ ...value, date });
  }

  function changeFrom(from: string) {
    if (!value || !network) return;
    const reachable = network.destinationsByOrigin[from] ?? [];
    onChange({ ...value, from, to: reachable.includes(value.to) ? value.to : (reachable[0] ?? "") });
  }

  function changeTo(to: string) {
    if (value) onChange({ ...value, to });
  }

  function swap() {
    if (value) onChange({ ...value, from: value.to, to: value.from });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.mode === "select") props.onContinue();
    else props.onSubmit();
  }

  const noBookableTrips =
    props.mode === "select" && ready && !props.tripsLoading && props.bookableTrips.length === 0;
  const submitDisabled =
    !ready || (props.mode === "select" ? props.selectedTripId === null : false);

  return (
    <form
      onSubmit={submit}
      aria-busy={network === undefined}
      className="rounded-xl border bg-card p-5 shadow-card sm:p-6"
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2",
          props.mode === "select"
            ? "lg:grid-cols-[1fr_1fr_auto_1fr_1fr]"
            : "lg:grid-cols-[1fr_1fr_auto_1fr]",
        )}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`} className={eyebrowClassName}>
            Select date
          </Label>
          <Input
            id={`${id}-date`}
            type="date"
            icon={<CalendarDays />}
            min={minDate}
            value={value?.date ?? minDate}
            onChange={(event) => changeDate(event.target.value)}
            disabled={!ready}
            className={TALL_INPUT}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-from`} className={eyebrowClassName}>
            Select pickup
          </Label>
          <NativeSelect
            id={`${id}-from`}
            icon={<CircleDot />}
            value={value?.from ?? ""}
            onChange={(event) => changeFrom(event.target.value)}
            disabled={!ready}
            className={TALL_SELECT}
          >
            {value && network ? (
              network.origins.map((origin) => (
                <NativeSelectOption key={origin} value={origin}>
                  {origin}
                </NativeSelectOption>
              ))
            ) : (
              <NativeSelectOption value="">{noRoutes ? "No routes available" : "Loading…"}</NativeSelectOption>
            )}
          </NativeSelect>
        </div>

        <div className="flex justify-center md:col-span-2 lg:col-span-1 lg:self-end lg:pb-0.5">
          <Button
            type="button"
            variant="soft"
            size="icon"
            aria-label="Swap pickup and destination"
            disabled={!swappable}
            onClick={swap}
          >
            <ArrowLeftRight />
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-to`} className={eyebrowClassName}>
            Select destination
          </Label>
          <NativeSelect
            id={`${id}-to`}
            icon={<MapPin />}
            value={value?.to ?? ""}
            onChange={(event) => changeTo(event.target.value)}
            disabled={!ready}
            className={TALL_SELECT}
          >
            {value ? (
              destinations.map((destination) => (
                <NativeSelectOption key={destination} value={destination}>
                  {destination}
                </NativeSelectOption>
              ))
            ) : (
              <NativeSelectOption value="">{noRoutes ? "No routes available" : "Loading…"}</NativeSelectOption>
            )}
          </NativeSelect>
        </div>

        {props.mode === "select" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-trip`} className={eyebrowClassName}>
              Select bus / time
            </Label>
            <NativeSelect
              id={`${id}-trip`}
              icon={<BusFront />}
              value={props.selectedTripId ?? ""}
              onChange={(event) => props.onSelectTrip(event.target.value)}
              disabled={!ready || props.bookableTrips.length === 0}
              className={TALL_SELECT}
            >
              {props.bookableTrips.length > 0 ? (
                props.bookableTrips.map((trip) => (
                  <NativeSelectOption key={trip.id} value={trip.id}>
                    {tripOptionLabel(trip)}
                  </NativeSelectOption>
                ))
              ) : (
                <NativeSelectOption value="">
                  {props.tripsLoading && ready ? "Loading trips…" : "Choose a trip"}
                </NativeSelectOption>
              )}
            </NativeSelect>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-end">
        {noBookableTrips ? (
          <p className="text-sm text-muted-foreground sm:mr-auto">No bookable trips for this search</p>
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
  );
}
