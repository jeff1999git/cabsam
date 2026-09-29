"use client";

import type { BookingDetails, CustomerWithStats, ISODateTime } from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@excelcabs/ui/components/sheet";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { DetailList, type DetailListItem } from "@excelcabs/ui/composites/detail-list";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { Ban, CircleCheck, Phone } from "lucide-react";
import { useId } from "react";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { AccountStatusBadge } from "@/components/status/account-status-badge";
import { BookingStatusBadge } from "@/components/status/booking-status-badge";
import { StopsLabel } from "@/components/common/stops-label";
import { formatDateLong, formatDayMonth, formatInstant, formatTime, instantToIst } from "@/lib/datetime";
import { formatMobile, pluralize, telHref } from "@/lib/format";
import { useBookings } from "@/queries/bookings";
import { useCustomer } from "@/queries/customers";

/** Latest bookings listed in the sheet; the count in the heading is the account's total. */
const SHEET_BOOKINGS_PAGE_SIZE = 10;

interface UserSheetProps {
  /** Row data shown until the detail query resolves, and kept while the sheet closes. */
  user: CustomerWithStats | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisable: (user: CustomerWithStats) => void;
  onEnable: (user: CustomerWithStats) => void;
}

/** 'Thu, 24 Sep 2026 · 10:15 AM' in IST. */
function formatJoinedAt(createdAt: ISODateTime): string {
  const { date, time } = instantToIst(createdAt);
  return `${formatDateLong(date)} · ${formatTime(time)}`;
}

function userItems(user: CustomerWithStats): DetailListItem[] {
  return [
    { label: "Email", value: user.email },
    {
      label: "Mobile",
      value: (
        <a
          href={telHref(user.mobile)}
          aria-label={`Call ${user.name}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <Phone aria-hidden="true" className="size-3.5" />
          {formatMobile(user.mobile)}
        </a>
      ),
    },
    { label: "Joined", value: formatJoinedAt(user.createdAt) },
    { label: "Status", value: <AccountStatusBadge status={user.status} /> },
    {
      label: "Bookings",
      value:
        user.totalBookings === 0
          ? "None"
          : `${pluralize(user.totalBookings, "booking")} · ${user.upcomingBookings} upcoming`,
    },
    { label: "Last booking", value: user.lastBookingAt ? formatInstant(user.lastBookingAt) : "Never" },
  ];
}

function BookingRow({ booking }: { booking: BookingDetails }) {
  const { trip } = booking;
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold">{booking.id}</p>
        <p className="mt-0.5 text-sm font-medium">
          {formatDayMonth(trip.date)} · {formatTime(trip.departureTime)}
        </p>
        <StopsLabel pickupPoint={booking.pickupPoint} dropPoint={booking.dropPoint} />
        <p className="text-xs text-muted-foreground">
          <RouteLabel route={trip.route} compact className="text-xs" />
        </p>
      </div>
      <BookingStatusBadge status={booking.status} />
    </li>
  );
}

function BookingsSkeleton() {
  return (
    <ul aria-busy="true" className="mt-1 divide-y">
      {Array.from({ length: 3 }, (_, index) => (
        <li key={index} className="space-y-2 py-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </li>
      ))}
    </ul>
  );
}

/** The account's latest bookings (newest first). */
function UserBookings({ customerId }: { customerId: string }) {
  const headingId = useId();
  const bookings = useBookings({ customerId, pageSize: SHEET_BOOKINGS_PAGE_SIZE });

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-semibold tracking-tight">
        Bookings{bookings.data ? ` (${bookings.data.total})` : ""}
      </h3>
      {bookings.isError ? (
        <QueryError
          error={bookings.error}
          onRetry={() => void bookings.refetch()}
          retrying={bookings.isFetching}
          className="mt-2"
        />
      ) : bookings.isPending ? (
        <BookingsSkeleton />
      ) : bookings.data.items.length > 0 ? (
        <>
          <ul className="mt-1 divide-y">
            {bookings.data.items.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </ul>
          {bookings.data.total > bookings.data.items.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing the latest {bookings.data.items.length} of {bookings.data.total}.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
      )}
    </section>
  );
}

function SheetSkeleton() {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Loading user</SheetTitle>
        <SheetDescription className="sr-only">User details are loading</SheetDescription>
      </SheetHeader>
      <SheetBody aria-busy="true" className="space-y-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        ))}
      </SheetBody>
    </>
  );
}

/** Right-hand panel with a customer account's details, its bookings and the disable / enable action. */
export function UserSheet({ user: row, open, onOpenChange, onDisable, onEnable }: UserSheetProps) {
  const detail = useCustomer(row?.id);
  const user = detail.data ?? row;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {user ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="text-base">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{user.name}</SheetTitle>
                  <SheetDescription className="truncate">{user.email}</SheetDescription>
                </div>
              </div>
              <div>
                <AccountStatusBadge status={user.status} />
              </div>
            </SheetHeader>
            <SheetBody className="space-y-6">
              <DetailList items={userItems(user)} columns={2} />
              <UserBookings customerId={user.id} />
            </SheetBody>
            <SheetFooter className="sm:flex-row sm:justify-end">
              {user.status === "active" ? (
                <Button variant="destructive" onClick={() => onDisable(user)}>
                  <Ban />
                  Disable user
                </Button>
              ) : (
                <Button onClick={() => onEnable(user)}>
                  <CircleCheck />
                  Enable user
                </Button>
              )}
            </SheetFooter>
          </>
        ) : detail.isError ? (
          <>
            <SheetHeader>
              <SheetTitle>User</SheetTitle>
              <SheetDescription className="sr-only">User details</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <QueryError error={detail.error} onRetry={() => void detail.refetch()} retrying={detail.isFetching} />
            </SheetBody>
          </>
        ) : (
          <SheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
  );
}
