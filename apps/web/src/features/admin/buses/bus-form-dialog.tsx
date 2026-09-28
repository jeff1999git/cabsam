"use client";

import { BUS_STATUSES, type BusWithUsage, type UpdateBusInput } from "@excelcabs/types";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@excelcabs/ui/components/native-select";
import { toast } from "@excelcabs/ui/components/sonner";
import { FormDialog } from "@excelcabs/ui/composites/form-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, CircleDot, Clock, Hash, MapPin, Users } from "lucide-react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { BUS_STATUS_META } from "@/components/status/bus-status-badge";
import { BUS_CAPACITY, ROUTE_DURATION_MINUTES } from "@/config/business";
import { applyServiceError } from "@/lib/form";
import { pluralize } from "@/lib/format";
import { type BusFormValues, busInputSchema } from "@/lib/schemas/bus";
import { useCreateBus, useUpdateBus } from "@/queries/buses";

interface BusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The bus to edit; `null` creates a new one. */
  bus: BusWithUsage | null;
}

const ROUTE_LOCKED_HINT = "Locked — this bus already has trips";

function defaultValues(bus: BusWithUsage | null): BusFormValues {
  return bus
    ? {
        name: bus.name,
        registrationNumber: bus.registrationNumber,
        origin: bus.origin,
        destination: bus.destination,
        durationMinutes: bus.durationMinutes,
        capacity: bus.capacity,
        status: bus.status,
      }
    : {
        name: "",
        registrationNumber: "",
        origin: "",
        destination: "",
        durationMinutes: Number.NaN,
        capacity: Number.NaN,
        status: "active",
      };
}

/**
 * Add / edit bus, including the route it permanently serves. From / To lock once the bus has run
 * a trip; capacity cannot drop below the bookings already on an upcoming trip.
 */
export function BusFormDialog({ open, onOpenChange, bus }: BusFormDialogProps) {
  const id = useId();
  const formId = `${id}-bus-form`;
  const createBus = useCreateBus();
  const updateBus = useUpdateBus();
  const pending = createBus.isPending || updateBus.isPending;

  const bookedFloor = bus?.maxBookedOnUpcomingTrip ?? 0;
  const minCapacity = Math.max(BUS_CAPACITY.min, bookedFloor);
  const routeLocked = bus !== null && bus.totalTripCount > 0;
  const deactivateBlocked = bus !== null && bus.status === "active" && bus.upcomingTripCount > 0;

  const form = useForm<BusFormValues>({
    resolver: zodResolver(busInputSchema),
    defaultValues: defaultValues(bus),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (bus) {
        const { origin, destination, ...rest } = values;
        const patch: UpdateBusInput = routeLocked ? rest : { ...rest, origin, destination };
        await updateBus.mutateAsync({ id: bus.id, patch });
        toast.success(`${values.name} updated`);
      } else {
        await createBus.mutateAsync(values);
        toast.success(`${values.name} added`);
      }
      onOpenChange(false);
    } catch (error) {
      // Taken name / registration, route and capacity conflicts land on the form; the rest was toasted.
      applyServiceError(error, form.setError);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={bus ? "Edit bus" : "Add bus"}
      description={
        bus
          ? `${bus.name} · ${bus.registrationNumber}`
          : "Each bus runs one route, out in the morning and back in the evening."
      }
      formId={formId}
      submitLabel={bus ? "Save changes" : "Add bus"}
      pending={pending}
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-name`}>Bus Name</FieldLabel>
                <Input
                  {...field}
                  id={`${id}-name`}
                  placeholder="Bus 7"
                  autoComplete="off"
                  icon={<BusFront />}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="registrationNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-registration`}>Registration Number</FieldLabel>
                <Input
                  {...field}
                  onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  id={`${id}-registration`}
                  placeholder="KL-08-BE-7310"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  icon={<Hash />}
                  className="font-mono uppercase"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>e.g. KL-08-BE-7310</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="origin"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} data-disabled={routeLocked}>
                  <FieldLabel htmlFor={`${id}-origin`}>From</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-origin`}
                    placeholder="Shakthan Stand"
                    autoComplete="off"
                    icon={<CircleDot />}
                    disabled={routeLocked}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="destination"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} data-disabled={routeLocked}>
                  <FieldLabel htmlFor={`${id}-destination`}>To</FieldLabel>
                  <Input
                    {...field}
                    id={`${id}-destination`}
                    placeholder="SmartCity"
                    autoComplete="off"
                    icon={<MapPin />}
                    disabled={routeLocked}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <FieldDescription className="-mt-2">
            {routeLocked
              ? `${ROUTE_LOCKED_HINT}. Add a new bus to serve different stops.`
              : "Morning trips run From → To and evening trips run back the other way."}
          </FieldDescription>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="durationMinutes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-duration`}>Est. duration (minutes)</FieldLabel>
                  <Input
                    {...field}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    id={`${id}-duration`}
                    type="number"
                    inputMode="numeric"
                    min={ROUTE_DURATION_MINUTES.min}
                    max={ROUTE_DURATION_MINUTES.max}
                    step={5}
                    placeholder="120"
                    icon={<Clock />}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    {ROUTE_DURATION_MINUTES.min}–{ROUTE_DURATION_MINUTES.max} minutes each way.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${id}-capacity`}>Capacity</FieldLabel>
                  <Input
                    {...field}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    id={`${id}-capacity`}
                    type="number"
                    inputMode="numeric"
                    min={minCapacity}
                    max={BUS_CAPACITY.max}
                    placeholder="40"
                    icon={<Users />}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    {bookedFloor > 0
                      ? `At least ${bookedFloor} — an upcoming trip already has ${pluralize(bookedFloor, "booking")}.`
                      : `${BUS_CAPACITY.min}–${BUS_CAPACITY.max} seats.`}
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
                <NativeSelect {...field} id={`${id}-status`} aria-invalid={fieldState.invalid}>
                  {BUS_STATUSES.map((status) => (
                    <NativeSelectOption
                      key={status}
                      value={status}
                      disabled={deactivateBlocked && status !== "active"}
                    >
                      {BUS_STATUS_META[status].label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {deactivateBlocked && bus ? (
                  <FieldDescription>
                    Reassign or cancel its {pluralize(bus.upcomingTripCount, "upcoming trip")} before
                    taking the bus out of service.
                  </FieldDescription>
                ) : null}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
