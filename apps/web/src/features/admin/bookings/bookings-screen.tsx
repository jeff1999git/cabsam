"use client";

import {
  BOOKING_STATUSES,
  type BookingDetails,
  type BookingListQuery,
  type BookingStatus,
} from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { Input } from "@excelcabs/ui/components/input";
import { Label } from "@excelcabs/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { PaginationBar } from "@excelcabs/ui/composites/pagination-bar";
import { SearchInput } from "@excelcabs/ui/composites/search-input";
import { useDebouncedValue } from "@excelcabs/ui/hooks/use-debounced-value";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { CalendarDays, Ticket, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { DateTile } from "@/components/common/date-tile";
import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { BOOKING_STATUS_META, BookingStatusBadge } from "@/components/status/booking-status-badge";
import { BOOKINGS_PAGE_SIZE } from "@/config/business";
import { StopsLabel } from "@/components/common/stops-label";
import { formatDayMonth, formatTime } from "@/lib/datetime";
import { formatMobile, formatRoute, pluralize } from "@/lib/format";
import { bookingFiltersSchema, parseSearchParams } from "@/lib/schemas/filters";
import { useBookings, useCancelBooking } from "@/queries/bookings";

import { BookingSheet } from "./booking-sheet";
import { type BookingsHrefParams, bookingsHref } from "./bookings-search-params";

function toBookingStatus(value: string): BookingStatus | undefined {
  return (BOOKING_STATUSES as readonly string[]).includes(value) ? (value as BookingStatus) : undefined;
}

interface BookingTarget {
  booking: BookingDetails;
  open: boolean;
}

interface RowActionsProps {
  booking: BookingDetails;
  onView: (booking: BookingDetails) => void;
  onCancel: (booking: BookingDetails) => void;
  className?: string;
}

function RowActions({ booking, onView, onCancel, className }: RowActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="soft" size="sm" onClick={() => onView(booking)}>
        View
      </Button>
      {booking.canCancel ? (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onCancel(booking)}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

function BookingCard({ booking, onView, onCancel }: Omit<RowActionsProps, "className">) {
  const { trip } = booking;
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-start gap-4">
        <DateTile date={trip.date} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-mono text-sm font-semibold">{booking.id}</p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 font-semibold">
            {formatTime(trip.departureTime)} · {trip.bus.name}
          </p>
          <p className="text-sm text-muted-foreground">
            <RouteLabel route={trip.route} compact />
          </p>
          <p className="mt-1 text-sm">
            {booking.passengerName}{" "}
            <span className="text-muted-foreground">· {formatMobile(booking.passengerMobile)}</span>
          </p>
          <StopsLabel pickupPoint={booking.pickupPoint} dropPoint={booking.dropPoint} className="mt-0.5" />
          <p className="text-xs text-muted-foreground">Driver: {trip.driver.name}</p>
        </div>
      </div>
      <RowActions booking={booking} onView={onView} onCancel={onCancel} className="[&>*]:flex-1" />
    </div>
  );
}

/** `/admin/bookings`: searchable, filterable, paginated list of every booking with view and cancel. */
export function AdminBookingsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = useId();
  const filters = parseSearchParams(bookingFiltersSchema, searchParams);
  const urlQ = filters.q ?? "";

  // The search box is typed locally and lands in the URL once the text settles.
  const [searchText, setSearchText] = useState(urlQ);
  const [syncedQ, setSyncedQ] = useState(urlQ);
  const debouncedQ = useDebouncedValue(searchText).trim();
  if (syncedQ !== urlQ) {
    // The URL changed under us (a link to this page, back/forward): adopt its search unless it is ours.
    setSyncedQ(urlQ);
    if (urlQ !== debouncedQ) setSearchText(urlQ);
  }
  const appliedQ = useRef(urlQ);
  useEffect(() => {
    if (appliedQ.current === debouncedQ) return;
    appliedQ.current = debouncedQ;
    if (debouncedQ !== urlQ) {
      router.replace(bookingsHref({ ...filters, q: debouncedQ, page: 1 }), { scroll: false });
    }
  }, [debouncedQ, urlQ, filters, router]);

  const query: BookingListQuery = {
    q: filters.q,
    date: filters.date,
    status: filters.status,
    page: filters.page,
    pageSize: BOOKINGS_PAGE_SIZE.default,
  };
  const bookings = useBookings(query);
  const cancelBooking = useCancelBooking();
  const [view, setView] = useState<BookingTarget | null>(null);
  const [cancel, setCancel] = useState<BookingTarget | null>(null);

  const hasFilters = Boolean(filters.q || filters.date || filters.status);

  function update(patch: BookingsHrefParams) {
    router.replace(bookingsHref({ ...filters, page: 1, ...patch }), { scroll: false });
  }

  function clearFilters() {
    setSearchText("");
    router.replace(bookingsHref({}), { scroll: false });
  }

  function openView(booking: BookingDetails) {
    setView({ booking, open: true });
  }

  function openCancel(booking: BookingDetails) {
    setCancel({ booking, open: true });
  }

  async function confirmCancel() {
    if (!cancel) return;
    await cancelBooking.mutateAsync({ id: cancel.booking.id });
    toast.success("Booking cancelled");
  }

  const columns: readonly ResponsiveTableColumn<BookingDetails>[] = [
    { id: "id", header: "Booking ID", cell: (booking) => <span className="font-mono text-xs">{booking.id}</span> },
    { id: "passenger", header: "Passenger", cell: (booking) => booking.passengerName },
    {
      id: "mobile",
      header: "Mobile",
      cell: (booking) => <span className="whitespace-nowrap tabular-nums">{formatMobile(booking.passengerMobile)}</span>,
    },
    { id: "date", header: "Date", cell: (booking) => <span className="whitespace-nowrap">{formatDayMonth(booking.trip.date)}</span> },
    { id: "time", header: "Time", cell: (booking) => <span className="whitespace-nowrap">{formatTime(booking.trip.departureTime)}</span> },
    {
      id: "stops",
      header: "Pickup → Drop",
      // Free-text stops wrap inside a bounded column instead of stretching the table.
      className: "whitespace-normal",
      cell: (booking) => (
        <StopsLabel pickupPoint={booking.pickupPoint} dropPoint={booking.dropPoint} className="min-w-36 max-w-56" />
      ),
    },
    { id: "route", header: "Route", cell: (booking) => <RouteLabel route={booking.trip.route} compact /> },
    { id: "bus", header: "Bus", cell: (booking) => booking.trip.bus.name },
    { id: "driver", header: "Driver", cell: (booking) => booking.trip.driver.name },
    { id: "status", header: "Status", cell: (booking) => <BookingStatusBadge status={booking.status} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (booking) => (
        <RowActions booking={booking} onView={openView} onCancel={openCancel} className="justify-end" />
      ),
    },
  ];

  const emptyState = hasFilters ? (
    <EmptyState
      icon={<Ticket />}
      title="No bookings match your filters"
      description="Try a different search, date or status."
      action={
        <Button variant="soft" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<Ticket />}
      title="No bookings yet"
      description="Bookings made by customers will show up here."
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description={bookings.data ? pluralize(bookings.data.total, "booking") : "All customer bookings"}
      />

      <div className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-search`} className={eyebrowClassName}>
              Search
            </Label>
            <SearchInput
              id={`${id}-search`}
              value={searchText}
              onValueChange={setSearchText}
              placeholder="Search booking ID, name, mobile or stop"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-date`} className={eyebrowClassName}>
              Trip date
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={`${id}-date`}
                type="date"
                icon={<CalendarDays />}
                value={filters.date ?? ""}
                onChange={(event) => {
                  // Native date inputs report "" while a date is being typed; the clear button resets it.
                  if (event.target.value) update({ date: event.target.value });
                }}
              />
              {filters.date ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear date"
                  className="shrink-0"
                  onClick={() => update({ date: undefined })}
                >
                  <X />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-status`} className={eyebrowClassName}>
              Status
            </Label>
            <NativeSelect
              id={`${id}-status`}
              value={filters.status ?? ""}
              onChange={(event) => update({ status: toBookingStatus(event.target.value) })}
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {BOOKING_STATUSES.map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {BOOKING_STATUS_META[status].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {hasFilters ? (
            <Button variant="ghost" className="text-muted-foreground" onClick={clearFilters}>
              <X />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {bookings.isError ? (
        <QueryError error={bookings.error} onRetry={() => void bookings.refetch()} retrying={bookings.isFetching} />
      ) : (
        <>
          <ResponsiveTable
            columns={columns}
            rows={bookings.data?.items ?? []}
            getRowKey={(booking) => booking.id}
            renderCard={(booking) => (
              <BookingCard booking={booking} onView={openView} onCancel={openCancel} />
            )}
            onRowClick={openView}
            loading={bookings.isPending}
            loadingRows={8}
            caption="Bookings"
            empty={emptyState}
            className={cn("transition-opacity", bookings.isPlaceholderData && "opacity-60")}
          />
          {bookings.data && bookings.data.total > 0 ? (
            <PaginationBar
              page={bookings.data.page}
              pageCount={bookings.data.pageCount}
              total={bookings.data.total}
              onPageChange={(page) => router.replace(bookingsHref({ ...filters, page }))}
              pending={bookings.isFetching}
            />
          ) : null}
        </>
      )}

      <BookingSheet
        booking={view?.booking}
        open={view?.open ?? false}
        onOpenChange={(open) => setView((current) => current && { ...current, open })}
        onCancel={(booking) => {
          setView((current) => current && { ...current, open: false });
          openCancel(booking);
        }}
      />

      {cancel ? (
        <ConfirmDialog
          open={cancel.open}
          onOpenChange={(open) => setCancel((current) => current && { ...current, open })}
          title={`Cancel booking ${cancel.booking.id}?`}
          description={`${cancel.booking.passengerName}'s seat on the ${formatTime(cancel.booking.trip.departureTime)} ${formatRoute(cancel.booking.trip.route)} trip on ${formatDayMonth(cancel.booking.trip.date)} will be released.`}
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          tone="destructive"
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}
