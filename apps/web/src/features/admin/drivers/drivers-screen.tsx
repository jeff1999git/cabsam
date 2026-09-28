"use client";

import {
  ACCOUNT_STATUSES,
  type AccountStatus,
  type DriverWithUsage,
  type UpdateDriverInput,
} from "@excelcabs/types";
import { Avatar, AvatarFallback } from "@excelcabs/ui/components/avatar";
import { Button } from "@excelcabs/ui/components/button";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { useDebouncedValue } from "@excelcabs/ui/hooks/use-debounced-value";
import { getInitials } from "@excelcabs/ui/lib/initials";
import { IdCard, Phone, Plus } from "lucide-react";
import { useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { ACCOUNT_STATUS_META, AccountStatusBadge } from "@/components/status/account-status-badge";
import { CatalogEmptyState } from "@/features/admin/catalog-shared/catalog-empty-state";
import { CatalogRowActions } from "@/features/admin/catalog-shared/catalog-row-actions";
import { CatalogToolbar } from "@/features/admin/catalog-shared/catalog-toolbar";
import { tripsFilterHref } from "@/features/admin/catalog-shared/trips-href";
import { UpcomingTripsCell } from "@/features/admin/catalog-shared/upcoming-trips-cell";
import { useEditor } from "@/features/admin/catalog-shared/use-editor";
import { useStatusToggle } from "@/features/admin/catalog-shared/use-status-toggle";
import { formatMobile, pluralize, telHref } from "@/lib/format";
import { useDrivers, useUpdateDriver } from "@/queries/drivers";

import { DriverFormDialog } from "./driver-form-dialog";

const STATUS_OPTIONS = ACCOUNT_STATUSES.map((status) => ({
  value: status,
  label: ACCOUNT_STATUS_META[status].label,
}));

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

/** `/admin/drivers`: driver accounts, with add / edit / disable. */
export function AdminDriversScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const q = useDebouncedValue(search.trim());
  const drivers = useDrivers({ q: q || undefined, status: status || undefined });
  const editor = useEditor<DriverWithUsage>();
  const updateDriver = useUpdateDriver();
  const toggle = useStatusToggle<DriverWithUsage, UpdateDriverInput>({
    mutation: updateDriver,
    patchFor: (active) => ({ status: active ? "active" : "disabled" }),
    label: (driver) => driver.name,
    tripsHref: (driver) => tripsFilterHref("driverId", driver.id),
    disableConsequence:
      "They won't be able to sign in or be assigned to trips until the account is enabled again.",
  });

  const filtered = search !== "" || status !== "";

  function clearFilters() {
    setSearch("");
    setStatus("");
  }

  function actionsFor(driver: DriverWithUsage, size: "sm" | "default", className?: string) {
    return (
      <CatalogRowActions
        label={driver.name}
        active={driver.status === "active"}
        busy={toggle.busyId === driver.id}
        onEdit={() => editor.edit(driver)}
        onDisable={() => toggle.requestDisable(driver)}
        onEnable={() => toggle.enable(driver)}
        size={size}
        className={className}
      />
    );
  }

  const columns: ResponsiveTableColumn<DriverWithUsage>[] = [
    {
      id: "name",
      header: "Name",
      cell: (driver) => (
        <span className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{driver.name}</span>
        </span>
      ),
    },
    { id: "email", header: "Email", cell: (driver) => driver.email },
    {
      id: "mobile",
      header: "Mobile",
      cell: (driver) => <MobileLink mobile={driver.mobile} name={driver.name} />,
    },
    {
      id: "upcoming",
      header: "Upcoming trips",
      cell: (driver) => (
        <UpcomingTripsCell
          count={driver.upcomingTripCount}
          href={tripsFilterHref("driverId", driver.id)}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (driver) => <AccountStatusBadge status={driver.status} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-px",
      cell: (driver) => actionsFor(driver, "sm", "justify-end"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Drivers"
        description="Staff accounts for the driver app. Only active drivers can be assigned to trips."
        actions={
          <Button type="button" onClick={editor.create}>
            <Plus />
            Add Driver
          </Button>
        }
      />

      <CatalogToolbar
        search={{
          value: search,
          onValueChange: setSearch,
          placeholder: "Search name, email or mobile",
          label: "Search drivers",
        }}
        status={{ value: status, onValueChange: setStatus, options: STATUS_OPTIONS }}
        summary={drivers.data ? pluralize(drivers.data.length, "driver") : undefined}
      />

      {drivers.isError ? (
        <QueryError
          error={drivers.error}
          onRetry={() => void drivers.refetch()}
          retrying={drivers.isFetching}
        />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={drivers.data ?? []}
          getRowKey={(driver) => driver.id}
          loading={drivers.isPending}
          loadingRows={6}
          caption="Drivers"
          empty={
            <CatalogEmptyState
              icon={<IdCard />}
              noun="drivers"
              description="Add driver accounts so they can be assigned to trips and sign in to the driver app."
              filtered={filtered}
              onClearFilters={clearFilters}
              onAdd={editor.create}
              addLabel="Add Driver"
            />
          }
          renderCard={(driver) => (
            <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="text-sm">{getInitials(driver.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="font-semibold">{driver.name}</p>
                    <AccountStatusBadge status={driver.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{driver.email}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <MobileLink mobile={driver.mobile} name={driver.name} />
                    <span aria-hidden="true">·</span>
                    <UpcomingTripsCell
                      count={driver.upcomingTripCount}
                      href={tripsFilterHref("driverId", driver.id)}
                      verbose
                    />
                  </p>
                </div>
              </div>
              {actionsFor(driver, "default", "[&>*]:flex-1")}
            </article>
          )}
        />
      )}

      <DriverFormDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.onOpenChange}
        driver={editor.item}
      />
      {toggle.dialogs}
    </div>
  );
}
