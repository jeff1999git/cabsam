"use client";

import {
  type CreateTripInput,
  type ISODate,
  type RouteEndpoints,
  TRIP_DIRECTIONS,
  type TripDetails,
  type TripDirection,
  type TripEditableField,
  type TripSummary,
} from "@excelcabs/types";
import { Alert, AlertTitle } from "@excelcabs/ui/components/alert";
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
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, CalendarDays, Clock, IdCard } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { QueryError } from "@/components/common/query-error";
import { applyServiceError } from "@/lib/form";
import { formatRoute, pluralize } from "@/lib/format";
import { type TripFormValues, tripFormSchema } from "@/lib/schemas/trip";
import { useBuses } from "@/queries/buses";
import { useDrivers } from "@/queries/drivers";
import { useCreateTrip, useTrip, useUpdateTrip } from "@/queries/trips";

import { busRouteOf, directionEndpoints, formatBusRoute, TRIP_DIRECTION_LABEL } from "./trip-route";

export type TripFormMode = { kind: "create"; date: ISODate } | { kind: "edit"; tripId: string };

interface TripFormDialogProps {
  mode: TripFormMode;
  open: boolean;
  /** Earliest date a trip can be scheduled for (today). */
  minDate: ISODate;
  onClose: () => void;
  onCreated: (trip: TripDetails) => void;
}

const LOCKED_HINT = "Locked — trip has bookings";

/** A new trip starts without a direction: it is picked once the bus (and so its route) is known. */
type TripFormDefaults = Omit<TripFormValues, "direction"> & { direction?: TripDirection };

interface SelectOption {
  value: string;
  label: string;
}

/** Appends `extra` when it is not already an option, so an edited trip keeps its current choice. */
function withOption(options: SelectOption[], extra: SelectOption | undefined): SelectOption[] {
  if (!extra || options.some((option) => option.value === extra.value)) return options;
  return [...options, extra];
}

/** 'Bus 2 · Shakthan Stand ⇄ SmartCity · 40 seats' */
function busOptionLabel(name: string, route: RouteEndpoints, capacity: number): string {
  return `${name} · ${formatBusRoute(route)} · ${pluralize(capacity, "seat")}`;
}

interface TripFormProps {
  formId: string;
  defaults: TripFormDefaults;
  minDate: ISODate;
  lockedFields: readonly TripEditableField[];
  /** The trip being edited: its bus and driver stay selectable even if no longer active. */
  current?: TripSummary;
  submit: (input: CreateTripInput) => Promise<void>;
}

function TripForm({ formId, defaults, minDate, lockedFields, current, submit }: TripFormProps) {
  const id = useId();
  const buses = useBuses({ status: "active" });
  const drivers = useDrivers({ status: "active" });
  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: defaults,
  });
  const busId = useWatch({ control: form.control, name: "busId" });

  const dateLocked = lockedFields.includes("date");
  const directionLocked = lockedFields.includes("direction");
  const optionsError = buses.error ?? drivers.error;
  const optionsLoading = buses.isPending || drivers.isPending;

  // The selected bus's route drives the direction labels; the edited trip's bus may no longer be active.
  const selectedBus = buses.data?.find((bus) => bus.id === busId);
  const busRoute: RouteEndpoints | undefined = selectedBus
    ? { origin: selectedBus.origin, destination: selectedBus.destination }
    : current && current.bus.id === busId
      ? busRouteOf(current)
      : undefined;

  const busOptions = withOption(
    (buses.data ?? []).map((bus) => ({ value: bus.id, label: busOptionLabel(bus.name, bus, bus.capacity) })),
    current
      ? {
          value: current.bus.id,
          label: `${busOptionLabel(current.bus.name, busRouteOf(current), current.bus.capacity)} (not in service)`,
        }
      : undefined,
  );
  const driverOptions = withOption(
    (drivers.data ?? []).map((driver) => ({ value: driver.id, label: driver.name })),
    current ? { value: current.driver.id, label: `${current.driver.name} (disabled)` } : undefined,
  );

  function retryOptions() {
    void Promise.all([buses.refetch(), drivers.refetch()]);
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await submit(values);
    } catch (error) {
      // Field errors (busy bus, holiday, route mismatch, …) land on the form; anything else was toasted globally.
      applyServiceError(error, form.setError);
    }
  });

  return (
    <form id={formId} onSubmit={onSubmit} noValidate aria-busy={optionsLoading} className="space-y-5">
      {optionsError ? <QueryError error={optionsError} onRetry={retryOptions} /> : null}
      <FieldGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-date`} className={eyebrowClassName}>
                Date
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
        <Controller
          name="departureTime"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-time`} className={eyebrowClassName}>
                Departure time
              </FieldLabel>
              <Input
                {...field}
                id={`${id}-time`}
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
              <FieldDescription>
                {directionLocked && current
                  ? `Passengers are booked for ${formatRoute(current.route)}, so only a bus on that route can take this trip.`
                  : "Each bus runs a fixed route; pick the bus and the route follows."}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="direction"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              aria-labelledby={`${id}-direction`}
              data-invalid={fieldState.invalid}
              data-disabled={directionLocked}
              className="sm:col-span-2"
            >
              <p id={`${id}-direction`} className={cn(eyebrowClassName, directionLocked && "opacity-50")}>
                Direction
              </p>
              <div className="flex gap-1 rounded-lg bg-field p-1">
                {TRIP_DIRECTIONS.map((direction, index) => {
                  const selected = field.value === direction;
                  return (
                    <Button
                      key={direction}
                      ref={index === 0 ? field.ref : undefined}
                      type="button"
                      variant={selected ? "default" : "ghost"}
                      aria-pressed={selected}
                      aria-invalid={fieldState.invalid}
                      disabled={directionLocked || busRoute === undefined}
                      className="min-w-0 flex-1"
                      onClick={() => field.onChange(direction)}
                      onBlur={field.onBlur}
                    >
                      {busRoute ? (
                        <>
                          <span className="sr-only">{TRIP_DIRECTION_LABEL[direction]}: </span>
                          <span className="truncate">{formatRoute(directionEndpoints(busRoute, direction))}</span>
                        </>
                      ) : (
                        TRIP_DIRECTION_LABEL[direction]
                      )}
                    </Button>
                  );
                })}
              </div>
              <FieldDescription>
                {directionLocked
                  ? LOCKED_HINT
                  : busRoute
                    ? "Outbound runs the bus's route as listed; return runs it the other way."
                    : "Choose a bus first — its route sets the two directions."}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="driverId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
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
      </FieldGroup>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={cn("space-y-2", (index === 2 || index === 3) && "sm:col-span-2")}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-11 w-full md:h-10" />
        </div>
      ))}
    </div>
  );
}

function valuesFromTrip(trip: TripDetails): TripFormValues {
  return {
    date: trip.date,
    departureTime: trip.departureTime,
    busId: trip.bus.id,
    direction: trip.direction,
    driverId: trip.driver.id,
  };
}

/**
 * Create / edit trip dialog. The route comes from the chosen bus; direction picks which way it
 * runs. Editing loads the trip for its `permissions` (locked fields); service field errors (busy bus
 * or driver, holiday, past date, route mismatch, capacity) show inline.
 */
export function TripFormDialog({ mode, open, minDate, onClose, onCreated }: TripFormDialogProps) {
  const formId = useId();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const editing = useTrip(mode.kind === "edit" ? mode.tripId : null);
  const isEdit = mode.kind === "edit";
  const trip = isEdit ? editing.data : undefined;
  const editable = trip?.permissions.canEdit ?? false;

  async function submit(input: CreateTripInput) {
    if (mode.kind === "create") {
      const created = await createTrip.mutateAsync(input);
      toast.success("Trip created");
      onClose();
      onCreated(created);
    } else {
      await updateTrip.mutateAsync({ id: mode.tripId, patch: input });
      toast.success("Trip updated");
      onClose();
    }
  }

  let body: ReactNode;
  if (mode.kind === "create") {
    body = (
      <TripForm
        formId={formId}
        defaults={{ date: mode.date, departureTime: "", busId: "", driverId: "" }}
        minDate={minDate}
        lockedFields={[]}
        submit={submit}
      />
    );
  } else if (trip) {
    body = editable ? (
      <TripForm
        formId={formId}
        defaults={valuesFromTrip(trip)}
        minDate={minDate}
        lockedFields={trip.permissions.lockedFields}
        current={trip}
        submit={submit}
      />
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
          ? "Change the schedule, bus or driver of this upcoming trip."
          : "Pick a bus, which way it runs and a driver. The route comes from the bus."
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
