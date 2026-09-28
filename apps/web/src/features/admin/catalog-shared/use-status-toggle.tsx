"use client";

import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import type { Route } from "next";
import { type ReactNode, useState } from "react";

import { DisableBlockedDialog } from "./disable-blocked-dialog";

/** The entity's update mutation (`useUpdateBus()` etc.), as far as the toggle needs it. */
interface StatusMutation<TPatch> {
  mutateAsync: (variables: { id: string; patch: TPatch }) => Promise<unknown>;
  isPending: boolean;
  variables: { id: string; patch: TPatch } | undefined;
}

export interface CatalogItem {
  id: string;
  status: string;
  upcomingTripCount: number;
}

interface StatusToggleOptions<TItem extends CatalogItem, TPatch> {
  mutation: StatusMutation<TPatch>;
  /** The patch that enables (`true`) or disables (`false`) an item. */
  patchFor: (active: boolean) => TPatch;
  /** Name used in dialogs and toasts, e.g. "Bus 2". */
  label: (item: TItem) => string;
  /** Trips filtered to the item, offered when disabling is blocked. */
  tripsHref: (item: TItem) => Route;
  /** What disabling means, shown in the confirmation. */
  disableConsequence: string;
}

interface PendingAction<TItem> {
  kind: "blocked" | "confirm";
  item: TItem;
  open: boolean;
}

export interface StatusToggle<TItem> {
  /** Opens the "has upcoming trips" dialog or, when there are none, the confirmation. */
  requestDisable: (item: TItem) => void;
  enable: (item: TItem) => void;
  /** Id of the item whose status is being saved, for button spinners. */
  busyId: string | null;
  /** Render once in the screen: the blocked and confirm dialogs. */
  dialogs: ReactNode;
}

/**
 * Shared enable / disable flow for buses and drivers: disabling an item with upcoming
 * trips is blocked with a link to those trips, otherwise it is confirmed; enabling is immediate.
 */
export function useStatusToggle<TItem extends CatalogItem, TPatch>({
  mutation,
  patchFor,
  label,
  tripsHref,
  disableConsequence,
}: StatusToggleOptions<TItem, TPatch>): StatusToggle<TItem> {
  const [action, setAction] = useState<PendingAction<TItem> | null>(null);

  async function setActive(item: TItem, active: boolean) {
    await mutation.mutateAsync({ id: item.id, patch: patchFor(active) });
    toast.success(`${label(item)} ${active ? "enabled" : "disabled"}`);
  }

  function requestDisable(item: TItem) {
    setAction({ kind: item.upcomingTripCount > 0 ? "blocked" : "confirm", item, open: true });
  }

  function enable(item: TItem) {
    // A failure is already reported by the global mutation error toast.
    setActive(item, true).catch(() => undefined);
  }

  function handleOpenChange(open: boolean) {
    if (!open) setAction((previous) => (previous ? { ...previous, open: false } : null));
  }

  const dialogs = action ? (
    <>
      <DisableBlockedDialog
        open={action.open && action.kind === "blocked"}
        onOpenChange={handleOpenChange}
        label={label(action.item)}
        upcomingTripCount={action.item.upcomingTripCount}
        tripsHref={tripsHref(action.item)}
      />
      <ConfirmDialog
        open={action.open && action.kind === "confirm"}
        onOpenChange={handleOpenChange}
        title={`Disable ${label(action.item)}?`}
        description={disableConsequence}
        confirmLabel="Disable"
        tone="destructive"
        onConfirm={() => setActive(action.item, false)}
      />
    </>
  ) : null;

  return {
    requestDisable,
    enable,
    busyId: mutation.isPending ? (mutation.variables?.id ?? null) : null,
    dialogs,
  };
}
