"use client";

import type { TripSummary } from "@excelcabs/types";
import { Field, FieldDescription, FieldError, FieldLabel } from "@excelcabs/ui/components/field";
import { toast } from "@excelcabs/ui/components/sonner";
import { Textarea } from "@excelcabs/ui/components/textarea";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { useId, useState } from "react";

import { formatDayMonth, formatTime } from "@/lib/datetime";
import { formatRoute, pluralize } from "@/lib/format";
import { cancelTripSchema } from "@/lib/schemas/trip";
import { useCancelTrip } from "@/queries/trips";

interface CancelTripDialogProps {
  trip: TripSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirms cancelling a scheduled trip (and its bookings) with an optional reason for passengers. */
export function CancelTripDialog({ trip, open, onOpenChange }: CancelTripDialogProps) {
  const id = useId();
  const cancelTrip = useCancelTrip();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function confirm() {
    const parsed = cancelTripSchema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? "Enter a shorter reason");
      throw parsed.error;
    }
    const result = await cancelTrip.mutateAsync({ id: trip.id, input: parsed.data });
    toast.success(
      result.cancelledBookings > 0
        ? `Trip cancelled · ${pluralize(result.cancelledBookings, "booking")} cancelled`
        : "Trip cancelled",
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancel the ${formatTime(trip.departureTime)} ${formatRoute(trip.route)} trip on ${formatDayMonth(trip.date)}?`}
      description={
        trip.bookedSeats > 0
          ? `${pluralize(trip.bookedSeats, "confirmed booking")} will be cancelled and the passengers' seats released.`
          : "This trip has no bookings yet."
      }
      confirmLabel="Cancel trip"
      cancelLabel="Keep trip"
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
          placeholder="e.g. Bus breakdown"
          aria-invalid={reasonError !== null}
        />
        <FieldDescription>Recorded on each cancelled booking.</FieldDescription>
        <FieldError>{reasonError}</FieldError>
      </Field>
    </ConfirmDialog>
  );
}
