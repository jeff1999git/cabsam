"use client";

import type { CustomerWithStats } from "@excelcabs/types";
import { Field, FieldDescription, FieldError, FieldLabel } from "@excelcabs/ui/components/field";
import { toast } from "@excelcabs/ui/components/sonner";
import { Textarea } from "@excelcabs/ui/components/textarea";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { useId, useState } from "react";

import { pluralize } from "@/lib/format";
import { customerStatusSchema } from "@/lib/schemas/customer";
import { useSetCustomerStatus } from "@/queries/customers";

const reasonSchema = customerStatusSchema.pick({ reason: true });

interface DisableUserDialogProps {
  user: CustomerWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function consequence(upcomingBookings: number): string {
  const signOut = "They will be signed out and won't be able to sign in.";
  if (upcomingBookings === 0) return `${signOut} They have no upcoming bookings.`;
  return `${signOut} ${pluralize(upcomingBookings, "confirmed upcoming booking")} will be cancelled and the seats released.`;
}

/** Confirms disabling a customer account (and cancelling its upcoming bookings) with an optional reason. */
export function DisableUserDialog({ user, open, onOpenChange }: DisableUserDialogProps) {
  const id = useId();
  const setStatus = useSetCustomerStatus();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function confirm() {
    const parsed = reasonSchema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? "Enter a shorter reason");
      throw parsed.error;
    }
    const result = await setStatus.mutateAsync({
      id: user.id,
      input: { status: "disabled", reason: parsed.data.reason || undefined },
    });
    toast.success(
      result.cancelledBookings > 0
        ? `User disabled · ${pluralize(result.cancelledBookings, "booking")} cancelled`
        : "User disabled",
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Disable ${user.name}?`}
      description={consequence(user.upcomingBookings)}
      confirmLabel="Disable"
      tone="destructive"
      onConfirm={confirm}
    >
      <Field data-invalid={reasonError !== null}>
        <FieldLabel htmlFor={`${id}-reason`}>Reason (optional)</FieldLabel>
        <Textarea
          id={`${id}-reason`}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          placeholder="e.g. Fake sign-up"
          aria-invalid={reasonError !== null}
        />
        <FieldDescription>Recorded on each cancelled booking.</FieldDescription>
        <FieldError>{reasonError}</FieldError>
      </Field>
    </ConfirmDialog>
  );
}
