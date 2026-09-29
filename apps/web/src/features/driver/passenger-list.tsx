"use client";

import type { TripPassenger } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { SearchInput } from "@excelcabs/ui/composites/search-input";
import { Phone, Users } from "lucide-react";
import { useState } from "react";

import { formatMobile, telHref } from "@/lib/format";

import { StopsLabel } from "@/components/common/stops-label";

/** Above this many passengers a filter box appears. */
const FILTER_THRESHOLD = 8;

function matchesFilter(passenger: TripPassenger, filter: string): boolean {
  const needle = filter.trim().toLowerCase();
  if (!needle) return true;
  return (
    passenger.name.toLowerCase().includes(needle) ||
    passenger.bookingId.toLowerCase().includes(needle) ||
    passenger.pickupPoint.toLowerCase().includes(needle) ||
    passenger.dropPoint.toLowerCase().includes(needle) ||
    passenger.mobile.includes(needle.replace(/\s/g, ""))
  );
}

interface PassengerListProps {
  passengers: readonly TripPassenger[];
}

/**
 * Passenger rows (name, booking ID, pickup → drop) with tap-to-call links; long lists get a filter
 * that matches name, booking ID, mobile, pickup or drop.
 */
export function PassengerList({ passengers }: PassengerListProps) {
  const [filter, setFilter] = useState("");
  const showFilter = passengers.length > FILTER_THRESHOLD;
  const visible = showFilter
    ? passengers.filter((passenger) => matchesFilter(passenger, filter))
    : passengers;

  if (passengers.length === 0) {
    return (
      <EmptyState
        variant="plain"
        icon={<Users />}
        title="No passengers booked"
        description="Bookings for this trip will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showFilter ? (
        <SearchInput
          value={filter}
          onValueChange={setFilter}
          aria-label="Filter passengers by name, booking ID, mobile, pickup or drop"
          placeholder="Name, booking ID, mobile or stop"
          clearLabel="Clear filter"
        />
      ) : null}
      {visible.length === 0 ? (
        <EmptyState
          variant="plain"
          title={`No passengers match "${filter.trim()}"`}
          action={
            <Button variant="soft" onClick={() => setFilter("")}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <ul className="divide-y">
          {visible.map((passenger) => (
            // Phones: name + call on the first line, stops across the full width below.
            // From `sm` the stops sit under the name and the call button spans both lines.
            <li
              key={passenger.bookingId}
              className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{passenger.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{passenger.bookingId}</p>
              </div>
              <a
                href={telHref(passenger.mobile)}
                aria-label={`Call ${passenger.name}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-soft px-3.5 text-sm font-semibold text-primary tabular-nums outline-none transition-colors hover:bg-primary-soft-strong focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:row-span-2"
              >
                <Phone className="size-4" aria-hidden="true" />
                {formatMobile(passenger.mobile)}
              </a>
              <StopsLabel
                pickupPoint={passenger.pickupPoint}
                dropPoint={passenger.dropPoint}
                className="col-span-2 sm:col-span-1"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
