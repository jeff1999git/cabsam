"use client";

import type { ISODate, TripSummary } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { StatusBadge } from "@excelcabs/ui/composites/status-badge";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import type { UseQueryResult } from "@tanstack/react-query";
import { BusFront, CalendarDays, RotateCcw } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { addDays, diffDays, formatDateLong, formatWeekdayDate, today } from "@/lib/datetime";
import { pluralize } from "@/lib/format";
import { useMyTrips } from "@/queries/trips";

import { TripCard, TripCardSkeleton } from "./trip-card";

/** Days after today covered by the "Upcoming" section. */
const UPCOMING_DAYS = 6;
const SKELETON_ROWS = 2;

/** The in-progress trip first (a driver has at most one), then the rest in departure order. */
function pinInProgress(trips: readonly TripSummary[]): TripSummary[] {
  return trips.toSorted(
    (a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress"),
  );
}

interface DateGroup {
  date: ISODate;
  trips: TripSummary[];
}

/** Groups consecutive trips by date, keeping the service's date-then-time order. */
function groupByDate(trips: readonly TripSummary[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const trip of trips) {
    const last = groups.at(-1);
    if (last?.date === trip.date) last.trips.push(trip);
    else groups.push({ date: trip.date, trips: [trip] });
  }
  return groups;
}

interface TripListProps {
  query: UseQueryResult<TripSummary[]>;
  empty: ReactNode;
  children: (trips: TripSummary[]) => ReactNode;
}

/** Loading / error / empty handling shared by both sections. */
function TripList({ query, empty, children }: TripListProps) {
  if (query.isPending) {
    return (
      <ul aria-busy="true" className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <TripCardSkeleton key={index} />
        ))}
      </ul>
    );
  }
  if (query.isError) {
    return (
      <QueryError
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  if (query.data.length === 0) return <>{empty}</>;
  return <>{children(query.data)}</>;
}

/** `/driver`: today's assigned trips (in-progress pinned first) and the next few days. */
export function DriverHomeScreen() {
  const [todayDate] = useState(today);
  const upcomingHeadingId = useId();

  const todayTrips = useMyTrips({ dateFrom: todayDate });
  const upcomingTrips = useMyTrips({
    dateFrom: addDays(todayDate, 1),
    dateTo: addDays(todayDate, UPCOMING_DAYS),
  });

  const todayCount = todayTrips.data?.length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section aria-label="Today" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Today&apos;s Trips</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {formatDateLong(todayDate)}
            </p>
          </div>
          {todayCount !== undefined ? (
            <StatusBadge tone="info">{pluralize(todayCount, "trip")}</StatusBadge>
          ) : null}
        </header>

        <TripList
          query={todayTrips}
          empty={
            <EmptyState
              icon={<BusFront />}
              title="No trips assigned today"
              description="Trips the office assigns to you for today will show up here."
              action={
                <Button
                  variant="soft"
                  loading={todayTrips.isFetching}
                  onClick={() => void todayTrips.refetch()}
                >
                  <RotateCcw />
                  Refresh
                </Button>
              }
            />
          }
        >
          {(trips) => (
            <ul className="flex flex-col gap-3">
              {pinInProgress(trips).map((trip) => (
                <TripCard key={trip.id} trip={trip} emphasis={trip.status === "in_progress"} />
              ))}
            </ul>
          )}
        </TripList>
      </section>

      <section aria-labelledby={upcomingHeadingId} className="flex flex-col gap-4">
        <div>
          <h2
            id={upcomingHeadingId}
            className="flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
            Upcoming
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your trips for the next {pluralize(UPCOMING_DAYS, "day")}.
          </p>
        </div>

        <TripList
          query={upcomingTrips}
          empty={
            <EmptyState
              icon={<CalendarDays />}
              title="No upcoming trips"
              description={`Nothing is assigned to you for the next ${pluralize(UPCOMING_DAYS, "day")}.`}
            />
          }
        >
          {(trips) => (
            <div className="flex flex-col gap-5">
              {groupByDate(trips).map((group) => (
                <div key={group.date} className="flex flex-col gap-3">
                  <h3 className={`flex items-baseline gap-2 ${eyebrowClassName}`}>
                    {formatWeekdayDate(group.date)}
                    {diffDays(todayDate, group.date) === 1 ? (
                      <span className="font-medium tracking-normal text-muted-foreground normal-case">
                        Tomorrow
                      </span>
                    ) : null}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {group.trips.map((trip) => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </TripList>
      </section>
    </div>
  );
}
