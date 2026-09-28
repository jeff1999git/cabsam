"use client";

import type { AdminDashboardSummary, BookingDetails, TripSummary } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { Section } from "@excelcabs/ui/composites/section";
import { StatCard } from "@excelcabs/ui/composites/stat-card";
import { BusFront, CalendarDays, CalendarOff, IdCard, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DateTile } from "@/components/common/date-tile";
import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { TimeTile } from "@/components/common/time-tile";
import { BookingStatusBadge } from "@/components/status/booking-status-badge";
import { TripStatusBadge } from "@/components/status/trip-status-badge";
import { bookingsHref } from "@/features/admin/bookings/bookings-search-params";
import { tripsHref } from "@/features/admin/trips/trips-search-params";
import { formatDateLong, formatDayMonth, formatTime, today } from "@/lib/datetime";
import { formatOccupancy, pluralize } from "@/lib/format";
import { useAdminDashboard } from "@/queries/dashboard";

const SCHEDULE_COLUMNS: readonly ResponsiveTableColumn<TripSummary>[] = [
  { id: "time", header: "Time", cell: (trip) => <span className="font-medium">{formatTime(trip.departureTime)}</span> },
  { id: "route", header: "Route", cell: (trip) => <RouteLabel route={trip.route} compact /> },
  {
    id: "bus",
    header: "Bus",
    cell: (trip) => (
      <span className="flex flex-col">
        <span>{trip.bus.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{trip.bus.registrationNumber}</span>
      </span>
    ),
  },
  { id: "driver", header: "Driver", cell: (trip) => trip.driver.name },
  {
    id: "bookings",
    header: "Bookings",
    cell: (trip) => <span className="tabular-nums">{formatOccupancy(trip.bookedSeats, trip.capacity)}</span>,
  },
  { id: "status", header: "Status", cell: (trip) => <TripStatusBadge status={trip.status} /> },
];

const RECENT_COLUMNS: readonly ResponsiveTableColumn<BookingDetails>[] = [
  { id: "id", header: "Booking ID", cell: (booking) => <span className="font-mono text-xs">{booking.id}</span> },
  { id: "passenger", header: "Passenger", cell: (booking) => booking.passengerName },
  {
    id: "trip",
    header: "Trip",
    cell: (booking) => `${formatDayMonth(booking.trip.date)} · ${formatTime(booking.trip.departureTime)}`,
  },
  { id: "route", header: "Route", cell: (booking) => <RouteLabel route={booking.trip.route} compact /> },
  { id: "status", header: "Status", cell: (booking) => <BookingStatusBadge status={booking.status} /> },
];

function ScheduleCard({ trip }: { trip: TripSummary }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card">
      <TimeTile time={trip.departureTime} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold">{trip.bus.name}</p>
          <TripStatusBadge status={trip.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          <RouteLabel route={trip.route} compact />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {trip.driver.name} · {formatOccupancy(trip.bookedSeats, trip.capacity)} booked
        </p>
      </div>
    </div>
  );
}

function RecentBookingCard({ booking }: { booking: BookingDetails }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-card">
      <DateTile date={booking.trip.date} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold">{booking.passengerName}</p>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatTime(booking.trip.departureTime)} · <RouteLabel route={booking.trip.route} compact />
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{booking.id}</p>
      </div>
    </div>
  );
}

function StatCards({ summary }: { summary: AdminDashboardSummary | undefined }) {
  const placeholder = <Skeleton className="h-8 w-14" />;
  const { todaysTrips, todaysBookings, buses, drivers } = summary ?? {};
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today's Trips"
        icon={<CalendarDays />}
        value={todaysTrips ? todaysTrips.total : placeholder}
        hint={
          todaysTrips
            ? `${todaysTrips.byStatus.in_progress} in progress · ${todaysTrips.byStatus.scheduled} upcoming`
            : undefined
        }
      />
      <StatCard
        label="Today's Bookings"
        icon={<Ticket />}
        tone="success"
        value={todaysBookings ? todaysBookings.travellingToday : placeholder}
        hint={todaysBookings ? `${todaysBookings.createdToday} booked today` : undefined}
      />
      <StatCard
        label="Active Buses"
        icon={<BusFront />}
        value={buses ? buses.active : placeholder}
        hint={buses ? `of ${pluralize(buses.total, "bus", "buses")}` : undefined}
      />
      <StatCard
        label="Active Drivers"
        icon={<IdCard />}
        value={drivers ? drivers.active : placeholder}
        hint={drivers ? `of ${pluralize(drivers.total, "driver")}` : undefined}
      />
    </div>
  );
}

/** `/admin`: today's figures, today's schedule, the latest bookings and the next holiday. */
export function AdminDashboardScreen() {
  const router = useRouter();
  const [todayDate] = useState(today);
  const dashboard = useAdminDashboard();
  const summary = dashboard.data;
  const date = summary?.date ?? todayDate;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Dashboard"
        description={formatDateLong(date)}
        actions={
          <Button asChild>
            <Link href={tripsHref({ create: true })}>
              <Plus />
              Create trip
            </Link>
          </Button>
        }
      />

      {dashboard.isError ? (
        <QueryError
          error={dashboard.error}
          onRetry={() => void dashboard.refetch()}
          retrying={dashboard.isFetching}
        />
      ) : (
        <>
          <StatCards summary={summary} />

          {summary?.nextHoliday ? (
            <Alert variant="info">
              <CalendarOff />
              <AlertTitle>
                Next holiday: {formatDateLong(summary.nextHoliday.date)} — {summary.nextHoliday.reason}
              </AlertTitle>
              <AlertDescription>
                <p>No trips run on holidays.</p>
                <Button variant="soft" size="sm" className="mt-1" asChild>
                  <Link href="/admin/holidays">Manage holidays</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <Section
            title="Today's schedule"
            description={summary ? pluralize(summary.todaysTrips.total, "trip") : undefined}
            actions={
              <Button variant="soft" size="sm" asChild>
                <Link href={tripsHref({ date })}>View all</Link>
              </Button>
            }
          >
            <ResponsiveTable
              columns={SCHEDULE_COLUMNS}
              rows={summary?.todaysTrips.items ?? []}
              getRowKey={(trip) => trip.id}
              renderCard={(trip) => <ScheduleCard trip={trip} />}
              onRowClick={(trip) => router.push(tripsHref({ date, tripId: trip.id }))}
              loading={summary === undefined}
              loadingRows={4}
              caption="Trips scheduled for today"
              empty={
                <EmptyState
                  icon={<CalendarDays />}
                  title="No trips today"
                  description="Nothing is scheduled for today yet."
                  action={
                    <Button variant="soft" asChild>
                      <Link href={tripsHref({ create: true })}>Create trip</Link>
                    </Button>
                  }
                />
              }
            />
          </Section>

          <Section
            title="Recent bookings"
            actions={
              <Button variant="soft" size="sm" asChild>
                <Link href="/admin/bookings">View all</Link>
              </Button>
            }
          >
            <ResponsiveTable
              columns={RECENT_COLUMNS}
              rows={summary?.recentBookings ?? []}
              getRowKey={(booking) => booking.id}
              renderCard={(booking) => <RecentBookingCard booking={booking} />}
              onRowClick={(booking) => router.push(bookingsHref({ q: booking.id }))}
              loading={summary === undefined}
              loadingRows={4}
              caption="Latest bookings"
              empty={
                <EmptyState
                  icon={<Ticket />}
                  title="No bookings yet"
                  description="Bookings made by customers will show up here."
                />
              }
            />
          </Section>
        </>
      )}
    </div>
  );
}
