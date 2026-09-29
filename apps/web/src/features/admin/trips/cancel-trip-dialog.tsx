"use client";

import type { CancelTripResult, TripCancelScope, TripSummary } from "@excelcabs/types";
import { Field, FieldDescription, FieldError, FieldLabel } from "@excelcabs/ui/components/field";
import { toast } from "@excelcabs/ui/components/sonner";
import { Textarea } from "@excelcabs/ui/components/textarea";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { useId, useState } from "react";

import { formatDayMonth, formatTime } from "@/lib/datetime";
import { formatRoute, pluralize } from "@/lib/format";
import { cancelTripSchema } from "@/lib/schemas/trip";
import { useCancelTrip, useTrip } from "@/queries/trips";

interface CancelTripDialogProps {
  trip: TripSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 'Trip cancelled · 18 bookings cancelled' · '9 trips cancelled' */
function cancelledMessage({ cancelledTrips, cancelledBookings }: CancelTripResult): string {
  const trips = cancelledTrips === 1 ? "Trip cancelled" : `${pluralize(cancelledTrips, "trip")} cancelled`;
  return cancelledBookings > 0 ? `${trips} · ${pluralize(cancelledBookings, "booking")} cancelled` : trips;
}

interface ScopeOption {
  value: TripCancelScope;
  label: string;
}

/**
 * Confirms cancelling a scheduled trip (and its bookings) with an optional reason for passengers. A
 * trip from a repeating schedule can also take the series' later scheduled trips with it.
 */
export function CancelTripDialog({ trip, open, onOpenChange }: CancelTripDialogProps) {
  const id = useId();
  const cancelTrip = useCancelTrip();
  const inSeries = trip.seriesId !== null;
  // The list row has no series details; load them for the "this and later trips" count.
  const details = useTrip(open && inSeries ? trip.id : null);
  const remaining = details.data?.series?.remainingTripCount;
  const [scope, setScope] = useState<TripCancelScope>("trip");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const scopeOptions: ScopeOption[] = [
    { value: "trip", label: "This trip only" },
    {
      value: "series",
      label: `This and later trips in the series${remaining === undefined ? "" : ` (${pluralize(remaining, "trip")})`}`,
    },
  ];

  async function confirm() {
    const parsed = cancelTripSchema.safeParse({ reason, scope });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? "Enter a shorter reason");
      throw parsed.error;
    }
    const result = await cancelTrip.mutateAsync({ id: trip.id, input: parsed.data });
    toast.success(cancelledMessage(result));
  }

  let description: string;
  if (scope === "series") {
    description = "Every confirmed booking on these trips will be cancelled and the seats released.";
  } else if (trip.bookedSeats > 0) {
    description = `${pluralize(trip.bookedSeats, "confirmed booking")} will be cancelled and the passengers' seats released.`;
  } else {
    description = "This trip has no bookings yet.";
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Cancel the ${formatTime(trip.departureTime)} ${formatRoute(trip.route)} trip on ${formatDayMonth(trip.date)}?`}
      description={description}
      confirmLabel={scope === "series" ? "Cancel trips" : "Cancel trip"}
      cancelLabel="Keep trip"
      tone="destructive"
      onConfirm={confirm}
    >
      {inSeries ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">This trip repeats. Which trips?</legend>
          {scopeOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-primary-soft"
            >
              <input
                type="radio"
                name={`${id}-scope`}
                value={option.value}
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className="size-4 shrink-0 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : null}
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
