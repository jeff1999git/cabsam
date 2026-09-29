"use client";

import type { ISODate, MyBookingScope } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@excelcabs/ui/components/tabs";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { homeHref } from "@/features/booking/search-params";
import { TripSearchForm } from "@/features/booking/trip-search-form";
import { useSession } from "@/hooks/use-session";
import { today } from "@/lib/datetime";
import type { StopPointsValues } from "@/lib/schemas/booking";
import { useMyBookings } from "@/queries/bookings";

import { BookingCard, BookingCardSkeleton } from "./booking-card";

interface BookingsTabConfig {
  scope: Exclude<MyBookingScope, "all">;
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}

const TABS: readonly BookingsTabConfig[] = [
  {
    scope: "upcoming",
    label: "Upcoming",
    emptyTitle: "No upcoming bookings",
    emptyDescription: "Book a seat on the next shuttle and it will show up here.",
  },
  {
    scope: "past",
    label: "Past",
    emptyTitle: "No past trips",
    emptyDescription: "Trips you have completed will show up here.",
  },
  {
    scope: "cancelled",
    label: "Cancelled",
    emptyTitle: "No cancelled bookings",
    emptyDescription: "Bookings you cancel will show up here.",
  },
];

const SKELETON_ROWS = 2;

function BookingsTab({ tab }: { tab: BookingsTabConfig }) {
  const bookings = useMyBookings({ scope: tab.scope });

  if (bookings.isPending) {
    return (
      <ul aria-busy="true" className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <BookingCardSkeleton key={index} />
        ))}
      </ul>
    );
  }
  if (bookings.isError) {
    return <QueryError error={bookings.error} onRetry={() => void bookings.refetch()} />;
  }
  if (bookings.data.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title={tab.emptyTitle}
        description={tab.emptyDescription}
        action={
          <Button asChild>
            <Link href="/">Book a trip</Link>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {bookings.data.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </ul>
  );
}

/** `/customer`: greeting, "Book a Trip" (date + pickup + drop → home search) and bookings by scope. */
export function CustomerDashboardScreen() {
  const router = useRouter();
  const { session } = useSession();
  const bookHeadingId = useId();
  const bookingsHeadingId = useId();
  const [minDate] = useState(today);
  const [date, setDate] = useState<ISODate>(minDate);
  const [stops, setStops] = useState<StopPointsValues>({ pickupPoint: "", dropPoint: "" });
  const upcoming = useMyBookings({ scope: "upcoming" });

  const firstName = session?.user.name.trim().split(/\s+/)[0] ?? "there";
  const upcomingCount = upcoming.data?.length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hi, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Book your next trip or manage your bookings.</p>
      </header>

      <section aria-labelledby={bookHeadingId} className="flex flex-col gap-4">
        <h2 id={bookHeadingId} className="text-xl font-semibold tracking-tight">
          Book a Trip
        </h2>
        <TripSearchForm
          mode="navigate"
          date={date}
          minDate={minDate}
          onDateChange={setDate}
          stops={stops}
          onStopsChange={setStops}
          onSubmit={(values) =>
            router.push(homeHref({ date, pickup: values.pickupPoint, drop: values.dropPoint }))
          }
        />
      </section>

      <section aria-labelledby={bookingsHeadingId} className="flex flex-col gap-4">
        <h2 id={bookingsHeadingId} className="text-xl font-semibold tracking-tight">
          My Bookings
        </h2>
        <Tabs defaultValue="upcoming">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.scope} value={tab.scope}>
                {tab.label}
                {tab.scope === "upcoming" && upcomingCount !== undefined ? ` (${upcomingCount})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent key={tab.scope} value={tab.scope}>
              <BookingsTab tab={tab} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
