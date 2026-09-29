"use client";

import { BUS_STATUSES, type BusWithUsage } from "@excelcabs/types";
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
import { BusFront, Hash, Users } from "lucide-react";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { BUS_STATUS_META } from "@/components/status/bus-status-badge";
import { BUS_CAPACITY } from "@/config/business";
import { applyServiceError } from "@/lib/form";
import { pluralize } from "@/lib/format";
import { type BusFormValues, busInputSchema } from "@/lib/schemas/bus";
import { useCreateBus, useUpdateBus } from "@/queries/buses";

interface BusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The bus to edit; `null` creates a new one. */
  bus: BusWithUsage | null;
  /**
   * Create mode: the next free "Bus N" (see `nextBusName`), pre-filled as the name and still
   * editable. `undefined` while the fleet is loading; it is filled in when it arrives.
   */
  suggestedName?: string;
}

function defaultValues(bus: BusWithUsage | null, suggestedName: string | undefined): BusFormValues {
  return bus
    ? {
        name: bus.name,
        registrationNumber: bus.registrationNumber,
        capacity: bus.capacity,
        status: bus.status,
      }
    : {
        name: suggestedName ?? "",
        registrationNumber: "",
        capacity: Number.NaN,
        status: "active",
      };
}

/**
 * Add / edit bus: a vehicle only — where and when it runs is set on each trip. Capacity cannot drop
 * below the bookings already on an upcoming trip.
 */
export function BusFormDialog({ open, onOpenChange, bus, suggestedName }: BusFormDialogProps) {
  const id = useId();
  const formId = `${id}-bus-form`;
  const createBus = useCreateBus();
  const updateBus = useUpdateBus();
  const pending = createBus.isPending || updateBus.isPending;

  const bookedFloor = bus?.maxBookedOnUpcomingTrip ?? 0;
  const minCapacity = Math.max(BUS_CAPACITY.min, bookedFloor);
  const deactivateBlocked = bus !== null && bus.status === "active" && bus.upcomingTripCount > 0;

  const form = useForm<BusFormValues>({
    resolver: zodResolver(busInputSchema),
    defaultValues: defaultValues(bus, suggestedName),
  });

  // "Add Bus" can open before the fleet has loaded: fill the suggested name in once it arrives,
  // unless the admin has already been in the field.
  useEffect(() => {
    if (bus || !suggestedName) return;
    if (form.getValues("name") === "" && !form.getFieldState("name").isTouched) {
      form.setValue("name", suggestedName);
    }
  }, [bus, suggestedName, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (bus) {
        await updateBus.mutateAsync({ id: bus.id, patch: values });
        toast.success(`${values.name} updated`);
      } else {
        await createBus.mutateAsync(values);
        toast.success(`${values.name} added`);
      }
      onOpenChange(false);
    } catch (error) {
      // Taken name / registration and capacity conflicts land on the form; the rest was toasted.
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
          : "Add a vehicle to the fleet. Routes and times are set on each trip."
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
                  placeholder={suggestedName ?? "Bus 1"}
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
          </div>
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
