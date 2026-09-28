"use client";

import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  type CustomerWithStats,
  type ISODate,
  type ISODateTime,
} from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { EmptyState } from "@excelcabs/ui/composites/empty-state";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { useDebouncedValue } from "@excelcabs/ui/hooks/use-debounced-value";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { cn } from "@excelcabs/ui/lib/utils";
import { Ban, CircleCheck, Phone, Users } from "lucide-react";
import { useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { ACCOUNT_STATUS_META, AccountStatusBadge } from "@/components/status/account-status-badge";
import { CatalogToolbar } from "@/features/admin/catalog-shared/catalog-toolbar";
import { diffDays, formatDayMonth, formatInstant, instantToIst, today } from "@/lib/datetime";
import { formatMobile, pluralize, telHref } from "@/lib/format";
import { useCustomers } from "@/queries/customers";

import { DisableUserDialog } from "./disable-user-dialog";
import { EnableUserDialog } from "./enable-user-dialog";
import { UserSheet } from "./user-sheet";

const STATUS_OPTIONS = ACCOUNT_STATUSES.map((status) => ({
  value: status,
  label: ACCOUNT_STATUS_META[status].label,
}));

interface ViewTarget {
  user: CustomerWithStats;
  open: boolean;
}

interface StatusAction {
  kind: "disable" | "enable";
  user: CustomerWithStats;
  open: boolean;
  /** Changes on every open; the dialog's `key`, so its reason field starts blank. */
  key: number;
}

interface JoinedLabel {
  /** 'Today' · 'Yesterday' · '3 days ago' · '24 Sep' · '3 Mar 2025' (the year only when it differs). */
  text: string;
  /** Relative wording, which reads in lower case mid-sentence ("Joined today"). */
  relative: boolean;
}

function joinedLabel(createdAt: ISODateTime, todayDate: ISODate): JoinedLabel {
  const { date } = instantToIst(createdAt);
  const daysAgo = diffDays(date, todayDate);
  if (daysAgo === 0) return { text: "Today", relative: true };
  if (daysAgo === 1) return { text: "Yesterday", relative: true };
  if (daysAgo > 1 && daysAgo < 7) return { text: `${daysAgo} days ago`, relative: true };
  const year = date.slice(0, 4);
  const text = year === todayDate.slice(0, 4) ? formatDayMonth(date) : `${formatDayMonth(date)} ${year}`;
  return { text, relative: false };
}

/** 'Joined today' · 'Joined 24 Sep' — for the mobile card. */
function joinedSentence(createdAt: ISODateTime, todayDate: ISODate): string {
  const { text, relative } = joinedLabel(createdAt, todayDate);
  return `Joined ${relative ? text.toLowerCase() : text}`;
}

/** '12 · 2 upcoming' in the table; '12 bookings · 2 upcoming' on cards. */
function bookingsSummary(user: CustomerWithStats, verbose: boolean): string {
  if (user.totalBookings === 0) return verbose ? "No bookings" : "None";
  const total = verbose ? pluralize(user.totalBookings, "booking") : String(user.totalBookings);
  return user.upcomingBookings > 0 ? `${total} · ${user.upcomingBookings} upcoming` : total;
}

function MobileLink({ mobile, name }: { mobile: string; name: string }) {
  return (
    <a
      href={telHref(mobile)}
      aria-label={`Call ${name}`}
      className="inline-flex items-center gap-1.5 tabular-nums underline-offset-4 hover:underline focus-visible:underline"
    >
      <Phone aria-hidden="true" className="size-3.5 text-muted-foreground" />
      {formatMobile(mobile)}
    </a>
  );
}

interface RowActionsProps {
  user: CustomerWithStats;
  onView: (user: CustomerWithStats) => void;
  onDisable: (user: CustomerWithStats) => void;
  onEnable: (user: CustomerWithStats) => void;
  /** `sm` in table rows, `default` (44px on touch screens) in mobile cards. */
  size: "sm" | "default";
  className?: string;
}

/** [View] plus [Disable] or [Enable] for a user row. */
function RowActions({ user, onView, onDisable, onEnable, size, className }: RowActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="soft"
        size={size}
        onClick={() => onView(user)}
        aria-label={`View ${user.name}`}
      >
        View
      </Button>
      {user.status === "active" ? (
        <Button
          type="button"
          variant="ghost"
          size={size}
          className="text-destructive hover:bg-destructive-soft hover:text-destructive"
          onClick={() => onDisable(user)}
          aria-label={`Disable ${user.name}`}
        >
          <Ban />
          Disable
        </Button>
      ) : (
        <Button
          type="button"
          variant="soft"
          size={size}
          onClick={() => onEnable(user)}
          aria-label={`Enable ${user.name}`}
        >
          <CircleCheck />
          Enable
        </Button>
      )}
    </div>
  );
}

/** `/admin/users`: self-registered customer accounts, with view and disable / enable. */
export function AdminUsersScreen() {
  const [todayDate] = useState(today);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const q = useDebouncedValue(search.trim());
  const customers = useCustomers({ q: q || undefined, status: status || undefined });
  const [view, setView] = useState<ViewTarget | null>(null);
  const [action, setAction] = useState<StatusAction | null>(null);

  const filtered = search !== "" || status !== "";

  function clearFilters() {
    setSearch("");
    setStatus("");
  }

  function openView(user: CustomerWithStats) {
    setView({ user, open: true });
  }

  function openAction(kind: StatusAction["kind"], user: CustomerWithStats) {
    setView((current) => current && { ...current, open: false });
    setAction((previous) => ({ kind, user, open: true, key: (previous?.key ?? 0) + 1 }));
  }

  function actionsFor(user: CustomerWithStats, size: "sm" | "default", className?: string) {
    return (
      <RowActions
        user={user}
        onView={openView}
        onDisable={(target) => openAction("disable", target)}
        onEnable={(target) => openAction("enable", target)}
        size={size}
        className={className}
      />
    );
  }

  const columns: ResponsiveTableColumn<CustomerWithStats>[] = [
    {
      id: "name",
      header: "Name",
      cell: (user) => (
        <span className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </span>
      ),
    },
    { id: "email", header: "Email", cell: (user) => user.email },
    {
      id: "mobile",
      header: "Mobile",
      cell: (user) => <MobileLink mobile={user.mobile} name={user.name} />,
    },
    {
      id: "joined",
      header: "Joined",
      cell: (user) => (
        <time dateTime={user.createdAt} title={formatInstant(user.createdAt)} className="whitespace-nowrap">
          {joinedLabel(user.createdAt, todayDate).text}
        </time>
      ),
    },
    {
      id: "bookings",
      header: "Bookings",
      cell: (user) => (
        <span className={cn("whitespace-nowrap tabular-nums", user.totalBookings === 0 && "text-muted-foreground")}>
          {bookingsSummary(user, false)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (user) => <AccountStatusBadge status={user.status} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-px",
      cell: (user) => actionsFor(user, "sm", "justify-end"),
    },
  ];

  const emptyState = filtered ? (
    <EmptyState
      icon={<Users />}
      title="No users match"
      description="Try a different search or show all statuses."
      action={
        <Button type="button" variant="soft" onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<Users />}
      title="No users yet"
      description="Customers who sign up on Excel Cabs will show up here."
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" description="Customer accounts that signed up on Excel Cabs" />

      <CatalogToolbar
        search={{
          value: search,
          onValueChange: setSearch,
          placeholder: "Search name, email or mobile",
          label: "Search users",
        }}
        status={{ value: status, onValueChange: setStatus, options: STATUS_OPTIONS }}
        summary={customers.data ? pluralize(customers.data.length, "user") : undefined}
      />

      {customers.isError ? (
        <QueryError
          error={customers.error}
          onRetry={() => void customers.refetch()}
          retrying={customers.isFetching}
        />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={customers.data ?? []}
          getRowKey={(user) => user.id}
          onRowClick={openView}
          loading={customers.isPending}
          loadingRows={8}
          caption="Users"
          empty={emptyState}
          renderCard={(user) => (
            <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="text-sm">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-semibold">{user.name}</p>
                    <AccountStatusBadge status={user.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <MobileLink mobile={user.mobile} name={user.name} />
                    <span aria-hidden="true">·</span>
                    <span>{joinedSentence(user.createdAt, todayDate)}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{bookingsSummary(user, true)}</p>
                </div>
              </div>
              {actionsFor(user, "default", "[&>*]:flex-1")}
            </article>
          )}
        />
      )}

      <UserSheet
        user={view?.user}
        open={view?.open ?? false}
        onOpenChange={(open) => setView((current) => current && { ...current, open })}
        onDisable={(user) => openAction("disable", user)}
        onEnable={(user) => openAction("enable", user)}
      />

      {action ? (
        action.kind === "disable" ? (
          <DisableUserDialog
            key={action.key}
            user={action.user}
            open={action.open}
            onOpenChange={(open) => setAction((current) => current && { ...current, open })}
          />
        ) : (
          <EnableUserDialog
            key={action.key}
            user={action.user}
            open={action.open}
            onOpenChange={(open) => setAction((current) => current && { ...current, open })}
          />
        )
      ) : null}
    </div>
  );
}
