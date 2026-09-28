"use client";

import type { TripSearchResult } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { cn } from "@excelcabs/ui/lib/utils";
import { CalendarOff, CalendarX2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { useSession } from "@/hooks/use-session";
import { addDays, formatDayMonth, formatWeekdayDate, today } from "@/lib/datetime";
import { useRouteNetwork } from "@/queries/routes";
import { useTripSearch } from "@/queries/trips";

import { BookingStepper } from "./booking-stepper";
import {
  type HomeSearchParams,
  homeHref,
  readHomeSearchParams,
  resolveTripSearch,
  type TripSearchState,
} from "./search-params";
import { TripResultRow, TripResultRowSkeleton } from "./trip-result-row";
import { TripSearchForm } from "./trip-search-form";
import { UpcomingBookingsSection } from "./upcoming-bookings-section";

const SKELETON_ROWS = 3;

interface TripResultsProps {
  result: TripSearchResult;
  selectedTripId: string | null;
  /** Results of a previous search shown while the new one loads. */
  stale: boolean;
  onSelectTrip: (tripId: string) => void;
  onContinue: () => void;
  onCheckNextDay: () => void;
}

function TripResults({
  result,
  selectedTripId,
  stale,
  onSelectTrip,
  onContinue,
  onCheckNextDay,
}: TripResultsProps) {
  if (result.holiday) {
    return (
      <Alert variant="info">
        <CalendarOff />
        <AlertTitle>
          No service on {formatDayMonth(result.holiday.date)} — {result.holiday.reason}
        </AlertTitle>
        <AlertDescription>
          <p>The shuttle does not run on holidays.</p>
          <Button type="button" variant="soft" size="sm" className="mt-1" onClick={onCheckNextDay}>
            Check next day
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (result.trips.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 />}
        title="No trips on this date"
        description="Try another date or a different route."
        action={
          <Button type="button" variant="soft" onClick={onCheckNextDay}>
            Try next day
          </Button>
        }
      />
    );
  }

  return (
    <ul className={cn("flex flex-col gap-3 transition-opacity", stale && "opacity-60")}>
      {result.trips.map((trip) => (
        <TripResultRow
          key={trip.id}
          trip={trip}
          selected={trip.id === selectedTripId}
          onSelect={() => onSelectTrip(trip.id)}
          onContinue={onContinue}
        />
      ))}
    </ul>
  );
}

/** Home page: Stepper, "Book Your Trip" search, the customer's upcoming bookings and the results. */
export function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, session } = useSession();
  const servicesHeadingId = useId();
  const [minDate] = useState(today);

  const network = useRouteNetwork();
  const raw = readHomeSearchParams(searchParams);
  const search = resolveTripSearch(raw, network.data, minDate);
  const results = useTripSearch(search);

  const bookableTrips = results.data?.trips.filter((trip) => trip.bookability.bookable) ?? [];
  const selectedTripId =
    (raw.trip !== undefined && bookableTrips.some((trip) => trip.id === raw.trip)
      ? raw.trip
      : bookableTrips[0]?.id) ?? null;
  const isCustomer = status === "authenticated" && session.user.role === "customer";

  function replaceSearch(next: HomeSearchParams) {
    router.replace(homeHref(next), { scroll: false });
  }

  function changeSearch(next: TripSearchState) {
    replaceSearch(next);
  }

  function selectTrip(tripId: string) {
    if (search) replaceSearch({ ...search, trip: tripId });
  }

  function checkNextDay() {
    if (search) replaceSearch({ ...search, date: addDays(search.date, 1) });
  }

  function continueToBooking() {
    if (selectedTripId) router.push(`/book/${selectedTripId}`);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <BookingStepper current={0} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Book Your Trip</h1>

      {network.isError ? (
        <QueryError error={network.error} onRetry={() => void network.refetch()} />
      ) : (
        <TripSearchForm
          mode="select"
          value={search}
          network={network.data}
          minDate={minDate}
          onChange={changeSearch}
          bookableTrips={bookableTrips}
          tripsLoading={results.data === undefined}
          selectedTripId={selectedTripId}
          onSelectTrip={selectTrip}
          onContinue={continueToBooking}
        />
      )}

      {isCustomer ? <UpcomingBookingsSection /> : null}

      {network.isError ? null : (
        <section
          aria-labelledby={servicesHeadingId}
          aria-busy={results.isFetching}
          className="flex flex-col gap-4"
        >
          <h2 id={servicesHeadingId} className="text-xl font-semibold tracking-tight">
            Available Services{search ? ` · ${formatWeekdayDate(search.date)}` : ""}
          </h2>
          {results.data ? (
            <TripResults
              result={results.data}
              selectedTripId={selectedTripId}
              stale={results.isPlaceholderData}
              onSelectTrip={selectTrip}
              onContinue={continueToBooking}
              onCheckNextDay={checkNextDay}
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
      )}
    </div>
  );
}
