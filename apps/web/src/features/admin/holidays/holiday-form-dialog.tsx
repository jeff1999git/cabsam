"use client";

import type { HolidayImpact, ISODate } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { Spinner } from "@excelcabs/ui/components/spinner";
import { toast } from "@excelcabs/ui/components/sonner";
import { ConfirmDialog } from "@excelcabs/ui/composites/confirm-dialog";
import { FormDialog } from "@excelcabs/ui/composites/form-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseQueryResult } from "@tanstack/react-query";
import { CalendarDays, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { formatDateLong, formatDayMonth, isValidISODate } from "@/lib/datetime";
import { applyServiceError } from "@/lib/form";
import { pluralize } from "@/lib/format";
import { type HolidayFormValues, holidayFormSchema } from "@/lib/schemas/holiday";
import { useCreateHoliday, useHolidayImpact } from "@/queries/holidays";
import { errorMessage } from "@/services/errors";

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Today (IST); earlier dates cannot become holidays. */
  minDate: ISODate;
}

interface PendingConfirmation {
  values: HolidayFormValues;
  impact: HolidayImpact;
  open: boolean;
}

function cancellationSummary(impact: HolidayImpact): string {
  return `${pluralize(impact.scheduledTrips.length, "trip")} and ${pluralize(impact.confirmedBookings, "booking")} on ${formatDateLong(impact.date)}`;
}

/** Live preview of what adding a holiday on the chosen date would cancel. */
function ImpactPreview({ impact }: { impact: UseQueryResult<HolidayImpact> }) {
  if (impact.isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" aria-label="Checking scheduled trips" />
        Checking scheduled trips…
      </p>
    );
  }
  if (impact.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Couldn&apos;t check scheduled trips</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(impact.error)}</p>
          <Button type="button" variant="soft" size="sm" onClick={() => void impact.refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const { data } = impact;
  if (data.existingHoliday) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>
          {formatDateLong(data.date)} is already a holiday ({data.existingHoliday.reason})
        </AlertTitle>
      </Alert>
    );
  }
  if (data.hasTripInProgress) {
    return (
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>A trip on {formatDayMonth(data.date)} is already in progress</AlertTitle>
        <AlertDescription>
          <p>Wait for it to complete before making the day a holiday.</p>
        </AlertDescription>
      </Alert>
    );
  }
  if (data.scheduledTrips.length > 0) {
    return (
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>{cancellationSummary(data)} will be cancelled</AlertTitle>
        <AlertDescription>
          <p>Passengers will see their bookings as cancelled. You&apos;ll be asked to confirm.</p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="success">
      <CircleCheck />
      <AlertTitle>No trips scheduled on this date</AlertTitle>
    </Alert>
  );
}

/** Add holiday: date + reason with an impact preview; cancelling that day's trips needs a confirmation. */
export function HolidayFormDialog({ open, onOpenChange, minDate }: HolidayFormDialogProps) {
  const id = useId();
  const formId = `${id}-holiday-form`;
  const createHoliday = useCreateHoliday();
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: { date: "", reason: "" },
  });
  const date = useWatch({ control: form.control, name: "date" });
  const previewDate = date >= minDate && isValidISODate(date) ? date : null;
  const impact = useHolidayImpact(previewDate);

  async function create(values: HolidayFormValues, cancelScheduledTrips: boolean) {
    const result = await createHoliday.mutateAsync({ ...values, cancelScheduledTrips });
    toast.success(
      result.cancelledTrips > 0
        ? `Holiday added · ${pluralize(result.cancelledTrips, "trip")} cancelled`
        : "Holiday added",
    );
    onOpenChange(false);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (impact.data?.existingHoliday) {
      form.setError("date", {
        type: "manual",
        message: `${formatDayMonth(values.date)} is already a holiday (${impact.data.existingHoliday.reason})`,
      });
      return;
    }
    if (impact.data && impact.data.scheduledTrips.length > 0) {
      setConfirmation({ values, impact: impact.data, open: true });
      return;
    }
    try {
      await create(values, false);
    } catch (error) {
      applyServiceError(error, form.setError);
    }
  });

  async function confirmCancellation(pending: PendingConfirmation) {
    try {
      await create(pending.values, true);
    } catch (error) {
      // Field errors go on the form behind this dialog; the rest was toasted globally.
      applyServiceError(error, form.setError);
    }
  }

  const submitBlocked =
    previewDate !== null && (impact.isPending || impact.data?.hasTripInProgress === true);

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Add holiday"
        description="The shuttle won't run on this date. Customers see the reason when they search."
        formId={formId}
        submitLabel="Add holiday"
        pending={createHoliday.isPending}
        submitDisabled={submitBlocked}
      >
        <form id={formId} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-date`}
                    type="date"
                    min={minDate}
                    icon={<CalendarDays />}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-reason`}>Reason</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-reason`}
                    placeholder="Gandhi Jayanti"
                    maxLength={80}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Shown to customers searching trips on this date.</FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {previewDate ? (
              <ImpactPreview impact={impact} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Pick a date to see which trips would be affected.
              </p>
            )}
          </FieldGroup>
        </form>
      </FormDialog>

      {confirmation ? (
        <ConfirmDialog
          open={confirmation.open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setConfirmation({ ...confirmation, open: false });
          }}
          title={`Cancel ${pluralize(confirmation.impact.scheduledTrips.length, "trip")} on ${formatDayMonth(confirmation.values.date)}?`}
          description={`${cancellationSummary(confirmation.impact)} will be cancelled. Passengers will see their bookings as cancelled.`}
          confirmLabel="Add holiday and cancel trips"
          cancelLabel="Go back"
          tone="destructive"
          onConfirm={() => confirmCancellation(confirmation)}
        />
      ) : null}
    </>
  );
}
