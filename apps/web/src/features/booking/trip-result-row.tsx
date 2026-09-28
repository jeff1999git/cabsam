"use client";

import type { TripSearchItem, TripUnbookableReason } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { StatusBadge, type StatusTone } from "@excelcabs/ui/composites/status-badge";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowRight } from "lucide-react";

import { RouteLabel } from "@/components/common/route-label";
import { TimeTile } from "@/components/common/time-tile";
import { formatSeats, pluralize } from "@/lib/format";

/** At or below this many free seats the pill turns into a warning. */
const LOW_SEATS_THRESHOLD = 5;

const UNBOOKABLE_LABELS: Record<TripUnbookableReason, string> = {
  full: "Full",
  departed: "Departed",
  not_scheduled: "Not running",
  holiday: "Not running",
};

function seatsPill(trip: TripSearchItem): { tone: StatusTone; label: string } {
  if (!trip.bookability.bookable) {
    return { tone: "muted", label: UNBOOKABLE_LABELS[trip.bookability.reason] };
  }
  if (trip.availableSeats <= LOW_SEATS_THRESHOLD) {
    return { tone: "warning", label: `Only ${pluralize(trip.availableSeats, "seat")} left` };
  }
  return { tone: "success", label: formatSeats(trip.availableSeats) };
}

interface TripResultRowProps {
  trip: TripSearchItem;
  selected: boolean;
  onSelect: () => void;
  /** Clicking the "Selected →" button proceeds to the booking page. */
  onContinue: () => void;
}

export function TripResultRow({ trip, selected, onSelect, onContinue }: TripResultRowProps) {
  const pill = seatsPill(trip);

  return (
    <li
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card transition-colors sm:flex-row sm:items-center sm:p-5",
        selected && "border-primary ring-1 ring-primary ring-inset",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <TimeTile time={trip.departureTime} selected={selected} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
            <span>{trip.bus.name}</span>
            <span className="font-mono text-xs font-normal text-muted-foreground">
              {trip.bus.registrationNumber}
            </span>
          </p>
          <p className="truncate text-sm text-muted-foreground">
            <RouteLabel route={trip.route} />
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <StatusBadge tone={pill.tone}>{pill.label}</StatusBadge>
        {trip.bookability.bookable ? (
          selected ? (
            <Button type="button" onClick={onContinue}>
              Selected
              <ArrowRight />
            </Button>
          ) : (
            <Button type="button" variant="soft" onClick={onSelect}>
              Select
            </Button>
          )
        ) : null}
      </div>
    </li>
  );
}

export function TripResultRowSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <Skeleton className="size-16 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
      <Skeleton className="hidden h-10 w-24 sm:block" />
    </li>
  );
}
