"use client";

import { TRIP_STATUSES, type TripStatus, type TripSummary } from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Input } from "@excelcabs/ui/components/input";
import { Label } from "@excelcabs/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { CalendarDays, CalendarX2, Plus, Repeat, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { TimeTile } from "@/components/common/time-tile";
import { TRIP_STATUS_META, TripStatusBadge } from "@/components/status/trip-status-badge";
import { formatDateLong, formatTime, formatWeekdayDate, today } from "@/lib/datetime";
import { formatOccupancy } from "@/lib/format";
import { useTrips } from "@/queries/trips";

import { CancelTripDialog } from "./cancel-trip-dialog";
import { BusFilterChip, DriverFilterChip } from "./trip-filter-chips";
import { type TripFormMode, TripFormDialog } from "./trip-form-dialog";
import { TripSheet } from "./trip-sheet";
import {
  matchesTripsParams,
  readTripsParams,
  TRIP_VIEW_LABEL,
  TRIP_VIEWS,
  type TripsHrefParams,
  tripListQuery,
  tripsHref,
} from "./trips-search-params";
import { useRetained } from "./use-retained";

/** How long a newly created trip's row stays tinted. */
const HIGHLIGHT_MS = 2000;

function toTripStatus(value: string): TripStatus | undefined {
  return (TRIP_STATUSES as readonly string[]).includes(value) ? (value as TripStatus) : undefined;
}

/** List rows carry no `permissions`; edit and cancel are offered for upcoming trips, as the service allows. */
function isActionable(trip: TripSummary): boolean {
  return trip.status === "scheduled";
}

/** Small "Repeats" marker for trips created as part of a repeating schedule. */
function RepeatsBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
      <Repeat className="size-3" aria-hidden="true" />
      Repeats
    </span>
  );
}

interface RowActionsProps {
  trip: TripSummary;
  onView: (trip: TripSummary) => void;
  onEdit: (trip: TripSummary) => void;
  onCancel: (trip: TripSummary) => void;
  className?: string;
}

function RowActions({ trip, onView, onEdit, onCancel, className }: RowActionsProps) {
  const actionable = isActionable(trip);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="soft" size="sm" onClick={() => onView(trip)}>
        View
      </Button>
      {actionable ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => onEdit(trip)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onCancel(trip)}>
            Cancel
          </Button>
        </>
      ) : null}
    </div>
  );
}

interface TripCardProps extends Omit<RowActionsProps, "className"> {
  /** Shown above the first card of each day (mobile group heading). */
  dateHeading: string | null;
  highlighted: boolean;
}

function TripCard({ trip, dateHeading, highlighted, ...actions }: TripCardProps) {
  return (
    <div>
      {dateHeading ? (
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{dateHeading}</h3>
      ) : null}
      <div
        data-trip-row={trip.id}
        className={cn(
          "flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card transition-shadow",
          highlighted && "ring-2 ring-primary",
        )}
      >
        <div className="flex items-start gap-4">
          <TimeTile time={trip.departureTime} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-semibold">{trip.bus.name}</p>
              <span className="font-mono text-xs text-muted-foreground">{trip.bus.registrationNumber}</span>
              <TripStatusBadge status={trip.status} />
              {trip.seriesId ? <RepeatsBadge /> : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <RouteLabel route={trip.route} compact />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Arrives {formatTime(trip.arrivalTime)} · {trip.driver.name} ·{" "}
              {formatOccupancy(trip.bookedSeats, trip.capacity)} booked
            </p>
          </div>
        </div>
        <RowActions trip={trip} {...actions} className="[&>*]:flex-1" />
      </div>
    </div>
  );
}

interface EditTarget {
  tripId: string;
  open: boolean;
}

interface CancelTarget {
  trip: TripSummary;
  open: boolean;
}

/** `/admin/trips`: the schedule by view (upcoming / date / past) with create, edit, cancel and detail. */
export function AdminTripsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = useId();
  const [todayDate] = useState(today);
  const params = readTripsParams(searchParams, todayDate);
  const trips = useTrips(tripListQuery(params, todayDate));

  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [cancel, setCancel] = useState<CancelTarget | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const sheetTripId = useRetained(params.tripId);

  useEffect(() => {
    if (highlightId === null) return;
    const timer = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  useEffect(() => {
    // Bring the new trip's row (table on desktop, card on mobile) into view once it is listed.
    if (highlightId === null) return;
    for (const row of document.querySelectorAll(`[data-trip-row="${highlightId}"]`)) {
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightId, trips.data]);

  const rows = params.view === "past" ? (trips.data ?? []).toReversed() : (trips.data ?? []);
  const firstOfDay = new Set<string>();
  const seenDates = new Set<string>();
  for (const trip of rows) {
    if (!seenDates.has(trip.date)) {
      seenDates.add(trip.date);
      firstOfDay.add(trip.id);
    }
  }

  const hasFilters = Boolean(params.status || params.busId || params.driverId);

  function replaceParams(patch: TripsHrefParams) {
    router.replace(tripsHref({ ...params, ...patch }), { scroll: false });
  }

  function clearFilters() {
    router.replace(tripsHref({ view: params.view, date: params.date }), { scroll: false });
  }

  function openCreate() {
    setEdit(null);
    replaceParams({ create: true });
  }

  function openEdit(trip: TripSummary) {
    setEdit({ tripId: trip.id, open: true });
  }

  function closeForm() {
    if (params.create) replaceParams({ create: false });
    setEdit((current) => current && { ...current, open: false });
  }

  function openSheet(trip: TripSummary) {
    replaceParams({ tripId: trip.id });
  }

  function closeSheet() {
    replaceParams({ tripId: undefined });
  }

  function openCancel(trip: TripSummary) {
    setCancel({ trip, open: true });
  }

  function revealCreated(trip: TripSummary) {
    if (!matchesTripsParams(trip, params, todayDate)) {
      router.replace(tripsHref({ view: "date", date: trip.date }), { scroll: false });
    }
    setHighlightId(trip.id);
  }

  const formMode: TripFormMode =
    !params.create && edit
      ? { kind: "edit", tripId: edit.tripId }
      : { kind: "create", date: params.view === "date" && params.date > todayDate ? params.date : todayDate };
  const formOpen = params.create || (edit?.open ?? false);

  const columns: readonly ResponsiveTableColumn<TripSummary>[] = [
    {
      id: "date",
      header: "Date",
      cell: (trip) => (
        <span
          data-trip-row={trip.id}
          data-highlighted={trip.id === highlightId || undefined}
          className="font-medium whitespace-nowrap"
        >
          {formatWeekdayDate(trip.date)}
        </span>
      ),
    },
    {
      id: "time",
      header: "Time",
      cell: (trip) => (
        <span className="whitespace-nowrap">
          {formatTime(trip.departureTime)} → {formatTime(trip.arrivalTime)}
        </span>
      ),
    },
    {
      id: "route",
      header: "Route",
      cell: (trip) => (
        <span className="flex flex-col items-start gap-1">
          <RouteLabel route={trip.route} compact />
          {trip.seriesId ? <RepeatsBadge /> : null}
        </span>
      ),
    },
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
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (trip) => (
        <RowActions trip={trip} onView={openSheet} onEdit={openEdit} onCancel={openCancel} className="justify-end" />
      ),
    },
  ];

  const emptyState = hasFilters ? (
    <EmptyState
      icon={<CalendarX2 />}
      title="No trips match your filters"
      description="Try removing a filter or switching the view."
      action={
        <Button variant="soft" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : params.view === "past" ? (
    <EmptyState icon={<CalendarX2 />} title="No past trips" description="Completed and cancelled trips will show up here." />
  ) : (
    <EmptyState
      icon={<CalendarDays />}
      title={params.view === "date" ? `No trips on ${formatDateLong(params.date)}` : "No upcoming trips"}
      description="Create a trip to start taking bookings."
      action={
        <Button onClick={openCreate}>
          <Plus />
          Create trip
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trips"
        description="Schedule, edit and cancel shuttle trips."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Create Trip
          </Button>
        }
      />

      <div className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-2">
            <p id={`${id}-view`} className={eyebrowClassName}>
              View
            </p>
            <div role="group" aria-labelledby={`${id}-view`} className="flex gap-1 rounded-lg bg-field p-1">
              {TRIP_VIEWS.map((view) => (
                <Button
                  key={view}
                  type="button"
                  size="sm"
                  variant={view === params.view ? "default" : "ghost"}
                  aria-pressed={view === params.view}
                  className="flex-1 lg:flex-none lg:px-4"
                  onClick={() => replaceParams({ view, date: params.date })}
                >
                  {TRIP_VIEW_LABEL[view]}
                </Button>
              ))}
            </div>
          </div>
          {params.view === "date" ? (
            <div className="flex flex-col gap-2 lg:w-52">
              <Label htmlFor={`${id}-date`} className={eyebrowClassName}>
                Date
              </Label>
              <Input
                id={`${id}-date`}
                type="date"
                icon={<CalendarDays />}
                value={params.date}
                onChange={(event) => {
                  // Native date inputs report "" while a date is being typed; keep the current one until valid.
                  if (event.target.value) replaceParams({ view: "date", date: event.target.value });
                }}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 lg:w-52">
            <Label htmlFor={`${id}-status`} className={eyebrowClassName}>
              Status
            </Label>
            <NativeSelect
              id={`${id}-status`}
              value={params.status ?? ""}
              onChange={(event) => replaceParams({ status: toTripStatus(event.target.value) })}
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {TRIP_STATUSES.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {TRIP_STATUS_META[status].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {hasFilters ? (
            <Button variant="ghost" className="text-muted-foreground lg:ml-auto" onClick={clearFilters}>
              <X />
              Clear filters
            </Button>
          ) : null}
        </div>
        {params.busId || params.driverId ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {params.busId ? (
              <BusFilterChip id={params.busId} onRemove={() => replaceParams({ busId: undefined })} />
            ) : null}
            {params.driverId ? (
              <DriverFilterChip id={params.driverId} onRemove={() => replaceParams({ driverId: undefined })} />
            ) : null}
          </div>
        ) : null}
      </div>

      {trips.isError ? (
        <QueryError error={trips.error} onRetry={() => void trips.refetch()} retrying={trips.isFetching} />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={rows}
          getRowKey={(trip) => trip.id}
          renderCard={(trip) => (
            <TripCard
              trip={trip}
              dateHeading={firstOfDay.has(trip.id) ? formatDateLong(trip.date) : null}
              highlighted={trip.id === highlightId}
              onView={openSheet}
              onEdit={openEdit}
              onCancel={openCancel}
            />
          )}
          onRowClick={openSheet}
          loading={trips.isPending}
          loadingRows={8}
          caption="Trips"
          empty={emptyState}
          className={cn(
            "transition-opacity [&_tr]:transition-colors [&_tr]:duration-700 [&_tr:has([data-highlighted])]:bg-primary-soft",
            trips.isPlaceholderData && "opacity-60",
          )}
        />
      )}

      <TripFormDialog
        mode={formMode}
        open={formOpen}
        minDate={todayDate}
        onClose={closeForm}
        onCreated={revealCreated}
      />

      <TripSheet
        tripId={sheetTripId}
        open={params.tripId !== undefined}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onEdit={(trip) => {
          closeSheet();
          openEdit(trip);
        }}
        onCancel={(trip) => {
          closeSheet();
          openCancel(trip);
        }}
      />

      {cancel ? (
        <CancelTripDialog
          key={cancel.trip.id}
          trip={cancel.trip}
          open={cancel.open}
          onOpenChange={(open) => setCancel((current) => current && { ...current, open })}
        />
      ) : null}
    </div>
  );
}
