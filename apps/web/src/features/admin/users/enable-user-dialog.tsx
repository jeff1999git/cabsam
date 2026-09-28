"use client";

import type { CustomerWithStats } from "@excelcabs/types";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";

import { useSetCustomerStatus } from "@/queries/customers";

interface EnableUserDialogProps {
  user: CustomerWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirms re-enabling a disabled customer account; bookings cancelled by disabling stay cancelled. */
export function EnableUserDialog({ user, open, onOpenChange }: EnableUserDialogProps) {
  const setStatus = useSetCustomerStatus();

  async function confirm() {
    await setStatus.mutateAsync({ id: user.id, input: { status: "active" } });
    toast.success("User enabled");
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Enable ${user.name}?`}
      description="They will be able to sign in again. Cancelled bookings are not restored."
      confirmLabel="Enable"
      onConfirm={confirm}
    />
  );
}
