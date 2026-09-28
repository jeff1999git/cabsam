import type { Route } from "next";
import Link from "next/link";

import { pluralize } from "@/lib/format";

interface UpcomingTripsCellProps {
  count: number;
  /** Trips filtered to the item; only linked when there are any. */
  href: Route;
  /** "12 upcoming trips" instead of "12 trips" (mobile cards, outside an "Upcoming trips" column). */
  verbose?: boolean;
}

/** Upcoming-trip count that links to those trips. */
export function UpcomingTripsCell({ count, href, verbose = false }: UpcomingTripsCellProps) {
  if (count === 0) {
    return <span className="text-muted-foreground">{verbose ? "No upcoming trips" : "None"}</span>;
  }
  return (
    <Link
      href={href}
      className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
    >
      {pluralize(count, verbose ? "upcoming trip" : "trip")}
    </Link>
  );
}
