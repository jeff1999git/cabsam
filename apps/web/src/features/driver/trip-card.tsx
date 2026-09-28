"use client";

import type { TripSummary } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { RouteLabel } from "@/components/common/route-label";
import { TimeTile } from "@/components/common/time-tile";
import { TripStatusBadge } from "@/components/status/trip-status-badge";
import { formatOccupancy } from "@/lib/format";

interface TripCardProps {
  trip: TripSummary;
  /** Navy border and filled time tile — the trip in progress, pinned at the top of the list. */
  emphasis?: boolean;
}

function occupancyPercent(trip: TripSummary): number {
  if (trip.capacity <= 0) return 0;
  return Math.min(100, Math.round((trip.bookedSeats / trip.capacity) * 100));
}

/** Driver trip row: TIME TILE · route + status · bus · occupancy bar, with a full-width "View Trip". */
export function TripCard({ trip, emphasis = false }: TripCardProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5",
        emphasis && "border-primary ring-1 ring-primary ring-inset",
      )}
    >
      <div className="flex items-start gap-4">
        <TimeTile time={trip.departureTime} selected={emphasis} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="min-w-0 font-semibold">
              <RouteLabel route={trip.route} />
            </p>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span>{trip.bus.name}</span>
            <span className="font-mono text-xs">{trip.bus.registrationNumber}</span>
          </p>
          <p className="mt-2 text-sm font-medium tabular-nums">
            {formatOccupancy(trip.bookedSeats, trip.capacity)} passengers
          </p>
          <div aria-hidden="true" className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${occupancyPercent(trip)}%` }}
            />
          </div>
        </div>
      </div>
      <Button size="lg" className="w-full" asChild>
        <Link href={`/driver/trips/${trip.id}`}>
          View Trip
          <ArrowRight />
        </Link>
      </Button>
    </li>
  );
}

export function TripCardSkeleton() {
  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-36 max-w-full" />
          <Skeleton className="h-3 w-28 max-w-full" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </li>
  );
}
