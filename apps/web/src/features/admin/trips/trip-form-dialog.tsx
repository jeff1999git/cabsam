"use client";

import {
  type ISODate,
  OPERATING_WEEKDAYS,
  type TripDetails,
  type TripEditableField,
  type TripSchedulePreview,
  type TripSummary,
  type Weekday,
} from "@excelcabs/types";
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
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { Skeleton } from "@excelcabs/ui/components/skeleton";
import { toast } from "@excelcabs/ui/components/sonner";
import { FormDialog } from "@excelcabs/ui/composites/form-dialog";
import { useDebouncedValue } from "@excelcabs/ui/hooks/use-debounced-value";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, CalendarDays, CalendarRange, Clock, IdCard, MapPin, Repeat } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";

import { QueryError } from "@/components/common/query-error";
import { TRIP_REPEAT_DEFAULT_DAYS, TRIP_REPEAT_MAX_DAYS } from "@/config/business";
import {
  addDays,
  formatDateRange,
  formatDuration,
  formatWeekday,
  formatWeekdayDate,
  formatWeekdays,
  isValidISODate,
  toMinutes,
} from "@/lib/datetime";
import { applyServiceError } from "@/lib/form";
import { pluralize } from "@/lib/format";
import {
  toCreateTripInput,
  toTripScheduleInput,
  toUpdateTripInput,
  TRIP_SCHEDULE_KINDS,
  type TripFormValues,
  tripFormSchema,
  type TripScheduleKind,
} from "@/lib/schemas/trip";
import { useBuses } from "@/queries/buses";
import { useDrivers } from "@/queries/drivers";
import { useCreateTrip, usePreviewSchedule, useTrip, useTrips, useUpdateTrip } from "@/queries/trips";
import { isServiceError } from "@/services/errors";

export type TripFormMode = { kind: "create"; date: ISODate } | { kind: "edit"; tripId: string };

interface TripFormDialogProps {
  mode: TripFormMode;
  open: boolean;
  /** Earliest date a trip can be scheduled for (today). */
  minDate: ISODate;
  onClose: () => void;
  /** Create mode: the first trip created (a repeating schedule creates several). */
  onCreated: (trip: TripSummary) => void;
}

const LOCKED_HINT = "Locked — trip has bookings";
const SCHEDULE_LABEL: Record<TripScheduleKind, string> = { once: "One-time", repeat: "Repeating" };
/** Skipped dates named in the preview before "and N more". */
const LISTED_SKIPS = 3;

interface SelectOption {
  value: string;
  label: string;
}

/** Appends `extra` when it is not already an option, so an edited trip keeps its current choice. */
function withOption(options: SelectOption[], extra: SelectOption | undefined): SelectOption[] {
  if (!extra || options.some((option) => option.value === extra.value)) return options;
  return [...options, extra];
}

/** 'Bus 2 · KL-08-BE-7310 · 40 seats' */
function busOptionLabel(bus: { name: string; registrationNumber: string; capacity: number }): string {
  return `${bus.name} · ${bus.registrationNumber} · ${pluralize(bus.capacity, "seat")}`;
}

/** Minutes from departure to arrival, or null while either time is incomplete or arrival is not later. */
function runningMinutes(departureTime: string, arrivalTime: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(departureTime) || !/^\d{2}:\d{2}$/.test(arrivalTime)) return null;
  const minutes = toMinutes(arrivalTime) - toMinutes(departureTime);
  return minutes > 0 ? minutes : null;
}

/** Stop names already used on trips, for the From / To suggestions. */
function useKnownStops(): string[] {
  const trips = useTrips();
  return useMemo(() => {
    const names = new Set<string>();
    for (const trip of trips.data ?? []) {
      names.add(trip.route.origin);
      names.add(trip.route.destination);
    }
    return [...names].toSorted((a, b) => a.localeCompare(b));
  }, [trips.data]);
}

/** "Creates 22 trips · skips Fri, 2 Oct (Gandhi Jayanti)" */
function describePreview(preview: TripSchedulePreview): string {
  const skipped = preview.skipped.map(
    (skip) => `${formatWeekdayDate(skip.date)}${skip.holidayReason ? ` (${skip.holidayReason})` : ""}`,
  );
  const listed = skipped.slice(0, LISTED_SKIPS).join(", ");
  const more = skipped.length > LISTED_SKIPS ? ` and ${skipped.length - LISTED_SKIPS} more` : "";
  const skips = skipped.length > 0 ? ` · skips ${listed}${more}` : "";
  if (preview.dates.length === 0) return `No trip dates — every date is a holiday${skips}`;
  return `Creates ${pluralize(preview.dates.length, "trip")}${skips}`;
}

interface SchedulePreviewProps {
  control: Control<TripFormValues>;
}

/** Live "Creates N trips · skips …" line for the create form's schedule (debounced). */
function SchedulePreview({ control }: SchedulePreviewProps) {
  const schedule = useWatch({ control, name: "schedule" });
  const date = useWatch({ control, name: "date" });
  const weekdays = useWatch({ control, name: "weekdays" });
  const until = useWatch({ control, name: "until" });
  const input = useMemo(
    () => toTripScheduleInput({ schedule, date, weekdays, until }),
    [schedule, date, weekdays, until],
  );
  const debounced = useDebouncedValue(input);
  const preview = usePreviewSchedule(debounced);

  let text: string | null = null;
  if (input && preview.data) text = describePreview(preview.data);
  const empty = preview.data?.dates.length === 0;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary sm:col-span-2",
        !text && "sr-only",
        empty && "bg-warning-soft text-warning",
        (preview.isFetching || input !== debounced) && "opacity-70",
      )}
    >
      <CalendarRange className="size-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

interface WeekdayChipsProps {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  onBlur: () => void;
  invalid: boolean;
  labelId: string;
}

/** Mon–Sat toggle chips, with Sunday shown switched off (no trips run on Sundays). */
function WeekdayChips({ value, onChange, onBlur, invalid, labelId }: WeekdayChipsProps) {
  function toggle(day: Weekday) {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.toSorted((a, b) => a - b));
  }
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {OPERATING_WEEKDAYS.map((day) => {
        const pressed = value.includes(day);
        return (
          <Button
            key={day}
            type="button"
            size="sm"
            variant={pressed ? "default" : "soft"}
            aria-pressed={pressed}
            aria-invalid={invalid}
            className="min-w-14 rounded-full"
            onClick={() => toggle(day)}
            onBlur={onBlur}
          >
            {formatWeekday(day)}
          </Button>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="soft"
        disabled
        title="Sundays are holidays"
        className="min-w-14 rounded-full line-through"
      >
        {formatWeekday(0)}
      </Button>
    </div>
  );
}

interface TripFormProps {
  formId: string;
  defaults: TripFormValues;
  minDate: ISODate;
  /** Create mode shows the One-time / Repeating schedule; editing is always one trip. */
  withSchedule: boolean;
  lockedFields: readonly TripEditableField[];
  /** The trip being edited: its bus and driver stay selectable even if no longer active. */
  current?: TripSummary;
  submit: (values: TripFormValues) => Promise<void>;
}

function TripForm({ formId, defaults, minDate, withSchedule, lockedFields, current, submit }: TripFormProps) {
  const id = useId();
  const buses = useBuses({ status: "active" });
  const drivers = useDrivers({ status: "active" });
  const knownStops = useKnownStops();
  const [conflicts, setConflicts] = useState<string[] | null>(null);
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: defaults,
  });
  const schedule = useWatch({ control: form.control, name: "schedule" });
  const date = useWatch({ control: form.control, name: "date" });
  const departureTime = useWatch({ control: form.control, name: "departureTime" });
  const arrivalTime = useWatch({ control: form.control, name: "arrivalTime" });

  const dateLocked = lockedFields.includes("date");
  const originLocked = lockedFields.includes("origin");
  const destinationLocked = lockedFields.includes("destination");
  const optionsError = buses.error ?? drivers.error;
  const optionsLoading = buses.isPending || drivers.isPending;
  const repeating = withSchedule && schedule === "repeat";
  const minutes = runningMinutes(departureTime, arrivalTime);
  const stopsListId = `${id}-stops`;

  const busOptions = withOption(
    (buses.data ?? []).map((bus) => ({ value: bus.id, label: busOptionLabel(bus) })),
    current ? { value: current.bus.id, label: `${busOptionLabel(current.bus)} (not in service)` } : undefined,
  );
  const driverOptions = withOption(
    (drivers.data ?? []).map((driver) => ({ value: driver.id, label: driver.name })),
    current ? { value: current.driver.id, label: `${current.driver.name} (disabled)` } : undefined,
  );

  function retryOptions() {
    void Promise.all([buses.refetch(), drivers.refetch()]);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setConflicts(null);
    try {
      await submit(values);
    } catch (error) {
      // A repeating schedule that clashes on some dates creates nothing: list the clashes above the
      // buttons. Other field errors (busy bus, holiday, past date, capacity) land on their fields.
      if (isServiceError(error) && error.reason === "SCHEDULE_CONFLICT") {
        const lines = [error.fieldErrors?.busId, error.fieldErrors?.driverId].filter(
          (line): line is string => Boolean(line),
        );
        setConflicts(lines.length > 0 ? lines : [error.message]);
        return;
      }
      applyServiceError(error, form.setError, { durationMinutes: "arrivalTime" });
    }
  });

  return (
    <form id={formId} onSubmit={onSubmit} noValidate aria-busy={optionsLoading} className="space-y-5">
      {optionsError ? <QueryError error={optionsError} onRetry={retryOptions} /> : null}
      <datalist id={stopsListId}>
        {knownStops.map((stop) => (
          <option key={stop} value={stop} />
        ))}
      </datalist>
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Controller
          name="busId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor={`${id}-bus`} className={eyebrowClassName}>
                Bus
              </FieldLabel>
              <NativeSelect
                {...field}
                id={`${id}-bus`}
                icon={<BusFront />}
                disabled={optionsLoading}
                aria-invalid={fieldState.invalid}
              >
                <NativeSelectOption value="">{optionsLoading ? "Loading…" : "Select bus"}</NativeSelectOption>
                {busOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="driverId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor={`${id}-driver`} className={eyebrowClassName}>
                Driver
              </FieldLabel>
              <NativeSelect
                {...field}
                id={`${id}-driver`}
                icon={<IdCard />}
                disabled={optionsLoading}
                aria-invalid={fieldState.invalid}
              >
                <NativeSelectOption value="">{optionsLoading ? "Loading…" : "Select driver"}</NativeSelectOption>
                {driverOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="origin"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-origin`} className={eyebrowClassName}>
                From
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-origin`}
                list={stopsListId}
                placeholder="e.g. Shakthan Stand"
                autoComplete="off"
                icon={<MapPin />}
                disabled={originLocked}
                aria-invalid={fieldState.invalid}
              />
              {originLocked ? <FieldDescription>{LOCKED_HINT}</FieldDescription> : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="destination"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-destination`} className={eyebrowClassName}>
                To
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-destination`}
                list={stopsListId}
                placeholder="e.g. SmartCity"
                autoComplete="off"
                icon={<MapPin />}
                disabled={destinationLocked}
                aria-invalid={fieldState.invalid}
              />
              {destinationLocked ? <FieldDescription>{LOCKED_HINT}</FieldDescription> : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="departureTime"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-departure`} className={eyebrowClassName}>
                Departure time
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-departure`}
                type="time"
                step={300}
                icon={<Clock />}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="arrivalTime"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-arrival`} className={eyebrowClassName}>
                Arrival time
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-arrival`}
                type="time"
                step={300}
                icon={<Clock />}
                aria-invalid={fieldState.invalid}
              />
              {minutes !== null && !fieldState.invalid ? (
                <FieldDescription>{formatDuration(minutes)} trip</FieldDescription>
              ) : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {withSchedule ? (
          <Controller
            name="schedule"
            control={form.control}
            render={({ field }) => (
              <Field aria-labelledby={`${id}-schedule`} className="sm:col-span-2">
                <p id={`${id}-schedule`} className={eyebrowClassName}>
                  Schedule
                </p>
                <div role="group" aria-labelledby={`${id}-schedule`} className="flex gap-1 rounded-lg bg-field p-1">
                  {TRIP_SCHEDULE_KINDS.map((kind, index) => {
                    const selected = field.value === kind;
                    return (
                      <Button
                        key={kind}
                        ref={index === 0 ? field.ref : undefined}
                        type="button"
                        variant={selected ? "default" : "ghost"}
                        aria-pressed={selected}
                        className="min-w-0 flex-1"
                        onClick={() => field.onChange(kind)}
                        onBlur={field.onBlur}
                      >
                        {kind === "repeat" ? <Repeat /> : <CalendarDays />}
                        {SCHEDULE_LABEL[kind]}
                      </Button>
                    );
                  })}
                </div>
              </Field>
            )}
          />
        ) : null}

        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-date`} className={eyebrowClassName}>
                {repeating ? "Start date" : "Date"}
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-date`}
                type="date"
                min={minDate}
                icon={<CalendarDays />}
                disabled={dateLocked}
                aria-invalid={fieldState.invalid}
              />
              {dateLocked ? <FieldDescription>{LOCKED_HINT}</FieldDescription> : null}
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {repeating ? (
          <>
            <Controller
              name="until"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-until`} className={eyebrowClassName}>
                    Repeat until
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-until`}
                    type="date"
                    min={isValidISODate(date) ? date : minDate}
                    max={isValidISODate(date) ? addDays(date, TRIP_REPEAT_MAX_DAYS) : undefined}
                    icon={<CalendarRange />}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Up to {TRIP_REPEAT_MAX_DAYS} days after the start date.</FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="weekdays"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                  <p id={`${id}-weekdays`} className={eyebrowClassName}>
                    Runs on
                  </p>
                  <WeekdayChips
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={fieldState.invalid}
                    labelId={`${id}-weekdays`}
                  />
                  <FieldDescription>
                    Sundays and holidays are skipped — no trips run on those days.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </>
        ) : null}

        {withSchedule ? <SchedulePreview control={form.control} /> : null}

        {conflicts ? (
          <Alert variant="destructive" className="sm:col-span-2">
            <AlertTitle>Schedule conflict — no trips were created</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {conflicts.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>Pick another bus, driver or time, or change the dates.</p>
            </AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className={cn("space-y-2", index < 2 && "sm:col-span-2")}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-11 w-full md:h-10" />
        </div>
      ))}
    </div>
  );
}

function createDefaults(date: ISODate): TripFormValues {
  return {
    busId: "",
    driverId: "",
    origin: "",
    destination: "",
    departureTime: "",
    arrivalTime: "",
    schedule: "once",
    date,
    weekdays: [...OPERATING_WEEKDAYS],
    until: addDays(date, TRIP_REPEAT_DEFAULT_DAYS),
  };
}

function valuesFromTrip(trip: TripDetails): TripFormValues {
  return {
    busId: trip.bus.id,
    driverId: trip.driver.id,
    origin: trip.route.origin,
    destination: trip.route.destination,
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    schedule: "once",
    date: trip.date,
    weekdays: [...OPERATING_WEEKDAYS],
    until: trip.date,
  };
}

/**
 * Create / edit trip dialog. Creating picks a bus, driver, route and times, then either one date or
 * a repeating schedule (weekdays until an end date; Sundays and holidays are skipped) with a live
 * preview of how many trips it makes. Editing changes one trip only — a trip in a series stays in
 * it — and loads the trip for its `permissions` (locked fields).
 */
export function TripFormDialog({ mode, open, minDate, onClose, onCreated }: TripFormDialogProps) {
  const formId = useId();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const editing = useTrip(mode.kind === "edit" ? mode.tripId : null);
  const isEdit = mode.kind === "edit";
  const trip = isEdit ? editing.data : undefined;
  const editable = trip?.permissions.canEdit ?? false;

  async function submit(values: TripFormValues) {
    if (mode.kind === "create") {
      const result = await createTrip.mutateAsync(toCreateTripInput(values));
      toast.success(result.trips.length === 1 ? "Trip created" : `${pluralize(result.trips.length, "trip")} created`);
      onClose();
      const [first] = result.trips;
      if (first) onCreated(first);
    } else {
      await updateTrip.mutateAsync({ id: mode.tripId, patch: toUpdateTripInput(values) });
      toast.success("Trip updated");
      onClose();
    }
  }

  let body: ReactNode;
  if (mode.kind === "create") {
    body = (
      <TripForm
        formId={formId}
        defaults={createDefaults(mode.date)}
        minDate={minDate}
        withSchedule
        lockedFields={[]}
        submit={submit}
      />
    );
  } else if (trip) {
    body = editable ? (
      <div className="space-y-5">
        {trip.series ? (
          <Alert variant="info">
            <Repeat />
            <AlertTitle>Changes apply to this trip only</AlertTitle>
            <AlertDescription>
              It repeats {formatWeekdays(trip.series.weekdays)} ·{" "}
              {formatDateRange(trip.series.startDate, trip.series.endDate)}; the other trips keep their details.
            </AlertDescription>
          </Alert>
        ) : null}
        <TripForm
          formId={formId}
          defaults={valuesFromTrip(trip)}
          minDate={minDate}
          withSchedule={false}
          lockedFields={trip.permissions.lockedFields}
          current={trip}
          submit={submit}
        />
      </div>
    ) : (
      <Alert variant="warning">
        <AlertTitle>Only upcoming trips can be edited.</AlertTitle>
      </Alert>
    );
  } else if (editing.isError) {
    body = <QueryError error={editing.error} onRetry={() => void editing.refetch()} retrying={editing.isFetching} />;
  } else {
    body = <FormSkeleton />;
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={isEdit ? "Edit trip" : "Create trip"}
      description={
        isEdit
          ? "Change the route, times, bus or driver of this upcoming trip."
          : "Assign a bus and driver to a route, once or on repeat. Sundays and holidays have no trips."
      }
      formId={formId}
      submitLabel={isEdit ? "Save changes" : "Create trip"}
      pending={createTrip.isPending || updateTrip.isPending}
      submitDisabled={isEdit && !editable}
      className="sm:max-w-xl"
    >
      {body}
    </FormDialog>
  );
}
