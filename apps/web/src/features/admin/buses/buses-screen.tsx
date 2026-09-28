"use client";

import {
  BUS_STATUSES,
  type BusStatus,
  type BusWithUsage,
  type UpdateBusInput,
} from "@excelcabs/types";
import { Button } from "@excelcabs/ui/components/button";
import { ResponsiveTable, type ResponsiveTableColumn } from "@excelcabs/ui/composites/data-table";
import { PageHeader } from "@excelcabs/ui/composites/page-header";
import { useDebouncedValue } from "@excelcabs/ui/hooks/use-debounced-value";
import { BusFront, Plus } from "lucide-react";
import { useState } from "react";

import { QueryError } from "@/components/common/query-error";
import { RouteLabel } from "@/components/common/route-label";
import { BUS_STATUS_META, BusStatusBadge } from "@/components/status/bus-status-badge";
import { CatalogEmptyState } from "@/features/admin/catalog-shared/catalog-empty-state";
import { CatalogRowActions } from "@/features/admin/catalog-shared/catalog-row-actions";
import { CatalogToolbar } from "@/features/admin/catalog-shared/catalog-toolbar";
import { tripsFilterHref } from "@/features/admin/catalog-shared/trips-href";
import { UpcomingTripsCell } from "@/features/admin/catalog-shared/upcoming-trips-cell";
import { useEditor } from "@/features/admin/catalog-shared/use-editor";
import { useStatusToggle } from "@/features/admin/catalog-shared/use-status-toggle";
import { formatDuration } from "@/lib/datetime";
import { pluralize } from "@/lib/format";
import { useBuses, useUpdateBus } from "@/queries/buses";

import { BusFormDialog } from "./bus-form-dialog";

const STATUS_OPTIONS = BUS_STATUSES.map((status) => ({
  value: status,
  label: BUS_STATUS_META[status].label,
}));

/** `/admin/buses`: the fleet, with add / edit / disable. */
export function AdminBusesScreen() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BusStatus | "">("");
  const q = useDebouncedValue(search.trim());
  const buses = useBuses({ q: q || undefined, status: status || undefined });
  const editor = useEditor<BusWithUsage>();
  const updateBus = useUpdateBus();
  const toggle = useStatusToggle<BusWithUsage, UpdateBusInput>({
    mutation: updateBus,
    patchFor: (active) => ({ status: active ? "active" : "inactive" }),
    label: (bus) => bus.name,
    tripsHref: (bus) => tripsFilterHref("busId", bus.id),
    disableConsequence:
      "It can't be assigned to new trips until it is enabled again. Existing trips are not affected.",
  });

  const filtered = search !== "" || status !== "";

  function clearFilters() {
    setSearch("");
    setStatus("");
  }

  function actionsFor(bus: BusWithUsage, size: "sm" | "default", className?: string) {
    return (
      <CatalogRowActions
        label={bus.name}
        active={bus.status === "active"}
        busy={toggle.busyId === bus.id}
        onEdit={() => editor.edit(bus)}
        onDisable={() => toggle.requestDisable(bus)}
        onEnable={() => toggle.enable(bus)}
        size={size}
        className={className}
      />
    );
  }

  const columns: ResponsiveTableColumn<BusWithUsage>[] = [
    {
      id: "bus",
      header: "Bus",
      cell: (bus) => (
        <span className="flex flex-col">
          <span className="font-medium">{bus.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{bus.registrationNumber}</span>
        </span>
      ),
    },
    { id: "route", header: "Route", cell: (bus) => <RouteLabel route={bus} bidirectional compact /> },
    { id: "duration", header: "Duration", cell: (bus) => formatDuration(bus.durationMinutes) },
    { id: "capacity", header: "Capacity", cell: (bus) => pluralize(bus.capacity, "seat") },
    {
      id: "upcoming",
      header: "Upcoming trips",
      cell: (bus) => (
        <UpcomingTripsCell count={bus.upcomingTripCount} href={tripsFilterHref("busId", bus.id)} />
      ),
    },
    { id: "status", header: "Status", cell: (bus) => <BusStatusBadge status={bus.status} /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-px",
      cell: (bus) => actionsFor(bus, "sm", "justify-end"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Buses"
        description="The fleet and the route each bus runs. Only active buses can be assigned to trips."
        actions={
          <Button type="button" onClick={editor.create}>
            <Plus />
            Add Bus
          </Button>
        }
      />

      <CatalogToolbar
        search={{
          value: search,
          onValueChange: setSearch,
          placeholder: "Search name or registration",
          label: "Search buses",
        }}
        status={{ value: status, onValueChange: setStatus, options: STATUS_OPTIONS }}
        summary={buses.data ? pluralize(buses.data.length, "bus", "buses") : undefined}
      />

      {buses.isError ? (
        <QueryError
          error={buses.error}
          onRetry={() => void buses.refetch()}
          retrying={buses.isFetching}
        />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={buses.data ?? []}
          getRowKey={(bus) => bus.id}
          loading={buses.isPending}
          loadingRows={6}
          caption="Buses"
          empty={
            <CatalogEmptyState
              icon={<BusFront />}
              noun="buses"
              description="Add the buses in your fleet and the route each one runs, so they can be scheduled on trips."
              filtered={filtered}
              onClearFilters={clearFilters}
              onAdd={editor.create}
              addLabel="Add Bus"
            />
          }
          renderCard={(bus) => (
            <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {bus.name}{" "}
                    <span className="font-mono text-sm font-normal text-muted-foreground">
                      {bus.registrationNumber}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <RouteLabel route={bus} bidirectional compact />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDuration(bus.durationMinutes)} · {pluralize(bus.capacity, "seat")} ·{" "}
                    <UpcomingTripsCell
                      count={bus.upcomingTripCount}
                      href={tripsFilterHref("busId", bus.id)}
                      verbose
                    />
                  </p>
                </div>
                <BusStatusBadge status={bus.status} />
              </div>
              {actionsFor(bus, "default", "[&>*]:flex-1")}
            </article>
          )}
        />
      )}

      <BusFormDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.onOpenChange}
        bus={editor.item}
      />
      {toggle.dialogs}
    </div>
  );
}
