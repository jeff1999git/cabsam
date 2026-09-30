"use client";

import type {
  BusRef,
  ISODate,
  ServiceClosure,
  TripSearchItem,
  TripSearchResult,
} from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { cn } from "@excelcabs/ui/lib/utils";
import { CalendarOff, CalendarX2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { useSession } from "@/hooks/use-session";
import { addDays, formatWeekdayDate, today } from "@/lib/datetime";
import type { StopPointsValues } from "@/lib/schemas/booking";
import { useNextOperatingDay, useTripSearch } from "@/queries/trips";

import { BookingStepper } from "./booking-stepper";
import {
  bookingHref,
  type HomeSearchParams,
  homeHref,
  parseSearchDate,
  readHomeSearchParams,
} from "./search-params";
import { TripResultRow, TripResultRowSkeleton } from "./trip-result-row";
import { TripSearchForm } from "./trip-search-form";
import { UpcomingBookingsSection } from "./upcoming-bookings-section";

const SKELETON_ROWS = 3;

/** A URL stop that changed is adopted unless it already matches what is typed (ignoring spaces). */
function adoptUrlStop(draft: string, previousUrl: string | undefined, url: string | undefined): string {
  if (url === previousUrl || (url ?? "") === draft.trim()) return draft;
  return url ?? "";
}

/**
 * Pickup / drop as typed on the search card. They start from the URL and are written back to it on
 * blur (and with every other search change). When the URL changes under us — our own write
 * landing, or a link such as the logo back to a bare `/` — each changed field is adopted, so the
 * inputs follow the URL without ever overwriting the field being typed in.
 */
function useStopDrafts(urlPickup: string | undefined, urlDrop: string | undefined) {
  const [stops, setStops] = useState<StopPointsValues>({
    pickupPoint: urlPickup ?? "",
    dropPoint: urlDrop ?? "",
  });
  const [synced, setSynced] = useState({ pickup: urlPickup, drop: urlDrop });
  if (synced.pickup !== urlPickup || synced.drop !== urlDrop) {
    setSynced({ pickup: urlPickup, drop: urlDrop });
    const next: StopPointsValues = {
      pickupPoint: adoptUrlStop(stops.pickupPoint, synced.pickup, urlPickup),
      dropPoint: adoptUrlStop(stops.dropPoint, synced.drop, urlDrop),
    };
    if (next.pickupPoint !== stops.pickupPoint || next.dropPoint !== stops.dropPoint) setStops(next);
  }
  return [stops, setStops] as const;
}

/** The date's buses in natural name order ("Bus 2" before "Bus 10"). */
function busesOf(trips: readonly TripSearchItem[]): BusRef[] {
  const byId = new Map<string, BusRef>();
  for (const trip of trips) byId.set(trip.bus.id, trip.bus);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

interface BusFilterProps {
  buses: readonly BusRef[];
  /** Bus id, or `null` for all buses. */
  value: string | null;
  onChange: (busId: string | null) => void;
}

function BusFilter({ buses, value, onChange }: BusFilterProps) {
  const chips = [{ id: null, label: "All buses" }, ...buses.map((bus) => ({ id: bus.id, label: bus.name }))];
  return (
    <div role="group" aria-label="Filter by bus" className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const pressed = chip.id === value;
        return (
          <Button
            key={chip.id ?? "all"}
            type="button"
            size="sm"
            variant={pressed ? "default" : "soft"}
            aria-pressed={pressed}
            className="rounded-full px-3.5"
            onClick={() => onChange(chip.id)}
          >
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}

interface ClosureBannerProps {
  closure: ServiceClosure;
  date: ISODate;
  onChangeDate: (date: ISODate) => void;
}

/** A Sunday or holiday, with a jump to the next day the shuttle runs. */
function ClosureBanner({ closure, date, onChangeDate }: ClosureBannerProps) {
  const nextOpen = useNextOperatingDay(date);
  return (
    <Alert variant="info">
      <CalendarOff />
      <AlertTitle>
        {closure.reason === "sunday"
          ? "No service on Sundays"
          : `No service on ${formatWeekdayDate(closure.holiday.date)} — ${closure.holiday.reason}`}
      </AlertTitle>
      <AlertDescription>
        <p>
          {closure.reason === "sunday"
            ? "The shuttle runs Monday to Saturday."
            : "The shuttle does not run on holidays."}
        </p>
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="mt-1"
          loading={nextOpen.isPending}
          onClick={() => onChangeDate(nextOpen.data ?? addDays(date, 1))}
        >
          Check next day
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface TripResultsProps {
  result: TripSearchResult;
  selectedTripId: string | null;
  /** Results of a previous date shown while the new one loads. */
  stale: boolean;
  onSelectTrip: (tripId: string) => void;
  onContinue: (tripId: string) => void;
  onChangeDate: (date: ISODate) => void;
}

function TripResults({
  result,
  selectedTripId,
  stale,
  onSelectTrip,
  onContinue,
  onChangeDate,
}: TripResultsProps) {
  const [busFilter, setBusFilter] = useState<string | null>(null);

  if (result.closure) {
    return <ClosureBanner closure={result.closure} date={result.date} onChangeDate={onChangeDate} />;
  }

  if (result.trips.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 />}
        title="No trips on this date"
        description="Try another date."
        action={
          <Button type="button" variant="soft" onClick={() => onChangeDate(addDays(result.date, 1))}>
            Try next day
          </Button>
        }
      />
    );
  }

  const buses = busesOf(result.trips);
  // A bus picked on another date falls back to "All buses".
  const activeBusId = buses.some((bus) => bus.id === busFilter) ? busFilter : null;
  const trips = activeBusId ? result.trips.filter((trip) => trip.bus.id === activeBusId) : result.trips;

  return (
    <div className="flex flex-col gap-4">
      {buses.length > 1 ? <BusFilter buses={buses} value={activeBusId} onChange={setBusFilter} /> : null}
      <ul inert={stale} className={cn("flex flex-col gap-3 transition-opacity", stale && "opacity-60")}>
        {trips.map((trip) => (
          <TripResultRow
            key={trip.id}
            trip={trip}
            selected={trip.id === selectedTripId}
            onSelect={() => onSelectTrip(trip.id)}
            onContinue={() => onContinue(trip.id)}
          />
        ))}
      </ul>
    </div>
  );
}

/** Home page: Stepper, "Book Your Trip" search, the customer's upcoming bookings and the date's trips. */
export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useSession();
  const servicesHeadingId = useId();
  const [minDate] = useState(today);

  const raw = readHomeSearchParams(searchParams);
  const nextOpen = useNextOperatingDay();
  // Without a usable URL date: the next day with service (today when it runs), or today if that
  // lookup fails. `null` while it loads.
  const date = parseSearchDate(raw.date) ?? nextOpen.data ?? (nextOpen.isError ? minDate : null);
  const [stops, setStops] = useStopDrafts(raw.pickup, raw.drop);
  const results = useTripSearch(date);

  // While another date loads, the previous results stay on screen (dimmed) but can't be picked.
  const current = results.isPlaceholderData ? undefined : results.data;
  const bookableTrips = current?.trips.filter((trip) => trip.bookability.bookable) ?? [];
  const selectedTripId =
    (raw.trip !== undefined && bookableTrips.some((trip) => trip.id === raw.trip)
      ? raw.trip
      : bookableTrips[0]?.id) ?? null;
  const isCustomer = status === "authenticated" && session.user.role === "customer";

  /** Rewrites the URL with the current search, the typed stops and `patch`. */
  function replaceSearch(patch: HomeSearchParams) {
    const next = homeHref({
      date: date ?? undefined,
      trip: raw.trip,
      pickup: stops.pickupPoint,
      drop: stops.dropPoint,
      ...patch,
    });
    if (next !== homeHref(raw)) router.replace(next, { scroll: false });
  }

  function commitStops() {
    const unchanged =
      (raw.pickup ?? "").trim() === stops.pickupPoint.trim() &&
      (raw.drop ?? "").trim() === stops.dropPoint.trim();
    if (!unchanged) replaceSearch({});
  }

  function goToBooking(tripId: string, pickup: string, drop: string) {
    router.push(bookingHref(tripId, { pickup, drop }));
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <BookingStepper current={0} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book Your Trip</h1>

      <TripSearchForm
        mode="select"
        date={date}
        minDate={minDate}
        onDateChange={(next) => replaceSearch({ date: next, trip: undefined })}
        stops={stops}
        onStopsChange={setStops}
        onStopsBlur={commitStops}
        bookableTrips={bookableTrips}
        tripsStatus={current ? "ready" : results.isError ? "error" : "loading"}
        selectedTripId={selectedTripId}
        onSelectTrip={(tripId) => replaceSearch({ trip: tripId })}
        onContinue={(values) => {
          if (selectedTripId) goToBooking(selectedTripId, values.pickupPoint, values.dropPoint);
        }}
      />

      {isCustomer ? <UpcomingBookingsSection /> : null}

      <section
        aria-labelledby={servicesHeadingId}
        aria-busy={results.isFetching}
        className="flex flex-col gap-4"
      >
        <h2 id={servicesHeadingId} className="text-xl font-semibold tracking-tight">
          Available Services{date ? ` · ${formatWeekdayDate(date)}` : ""}
        </h2>
        {results.data ? (
          <TripResults
            result={results.data}
            selectedTripId={selectedTripId}
            stale={results.isPlaceholderData}
            onSelectTrip={(tripId) => replaceSearch({ trip: tripId })}
            // No validation here: the booking page asks for missing stops.
            onContinue={(tripId) => goToBooking(tripId, stops.pickupPoint, stops.dropPoint)}
            onChangeDate={(next) => replaceSearch({ date: next, trip: undefined })}
          />
        ) : results.isError ? (
          <QueryError error={results.error} onRetry={() => void results.refetch()} />
        ) : (
          <ul className="flex flex-col gap-3">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <TripResultRowSkeleton key={index} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
