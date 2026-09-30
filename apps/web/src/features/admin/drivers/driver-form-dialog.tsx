"use client";

import { ACCOUNT_STATUSES, type DriverWithUsage, type UpdateDriverInput } from "@excelcabs/types";
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
import { Mail, Phone, UserRound } from "lucide-react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import { ACCOUNT_STATUS_META } from "@/components/status/account-status-badge";
import { applyServiceError } from "@/lib/form";
import { pluralize } from "@/lib/format";
import {
  type DriverCreateValues,
  driverCreateSchema,
  driverEditFormSchema,
} from "@/lib/schemas/driver";
import { useCreateDriver, useUpdateDriver } from "@/queries/drivers";

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The driver to edit; `null` creates a new account. */
  driver: DriverWithUsage | null;
}

function defaultValues(driver: DriverWithUsage | null): DriverCreateValues {
  return driver
    ? {
        name: driver.name,
        email: driver.email,
        mobile: driver.mobile,
        password: "",
        status: driver.status,
      }
    : { name: "", email: "", mobile: "", password: "", status: "active" };
}

/** Add / edit driver account. On edit a blank password keeps the current one. */
export function DriverFormDialog({ open, onOpenChange, driver }: DriverFormDialogProps) {
  const id = useId();
  const formId = `${id}-driver-form`;
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const pending = createDriver.isPending || updateDriver.isPending;

  const disableBlocked =
    driver !== null && driver.status === "active" && driver.upcomingTripCount > 0;

  const form = useForm<DriverCreateValues>({
    resolver: driver ? zodResolver(driverEditFormSchema) : zodResolver(driverCreateSchema),
    defaultValues: defaultValues(driver),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (driver) {
        const { password, ...profile } = values;
        const patch: UpdateDriverInput = password ? { ...profile, password } : profile;
        await updateDriver.mutateAsync({ id: driver.id, patch });
        toast.success(`${values.name} updated`);
      } else {
        await createDriver.mutateAsync(values);
        toast.success("Driver added — they can sign in at Staff › Driver sign in");
      }
      onOpenChange(false);
    } catch (error) {
      // A taken email lands on the form; anything else was toasted globally.
      applyServiceError(error, form.setError);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={driver ? "Edit driver" : "Add driver"}
      description={
        driver ? driver.email : "Drivers sign in with this email at Staff › Driver sign in."
      }
      formId={formId}
      submitLabel={driver ? "Save changes" : "Add driver"}
      pending={pending}
    >
      <form id={formId} onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
                <Input
                  {...field}
                  id={`${id}-name`}
                  placeholder="Titto Excel"
                  autoComplete="off"
                  icon={<UserRound />}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
                <Input
                  {...field}
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  placeholder="driver@excelcabs.com"
                  autoComplete="off"
                  icon={<Mail />}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="mobile"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-mobile`}>Mobile</FieldLabel>
                <Input
                  {...field}
                  id={`${id}-mobile`}
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  autoComplete="off"
                  icon={<Phone />}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>Passengers and admins can call this number.</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${id}-password`}>
                  {driver ? "New password" : "Password"}
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id={`${id}-password`}
                  autoComplete="new-password"
                  placeholder={driver ? "Leave blank to keep the current password" : "At least 8 characters"}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  {driver
                    ? "Leave blank to keep the current password."
                    : "Share it with the driver; they can't reset it themselves."}
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
                  {ACCOUNT_STATUSES.map((status) => (
                    <NativeSelectOption
                      key={status}
                      value={status}
                      disabled={disableBlocked && status !== "active"}
                    >
                      {ACCOUNT_STATUS_META[status].label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {disableBlocked && driver ? (
                  <FieldDescription>
                    Reassign or cancel their {pluralize(driver.upcomingTripCount, "upcoming trip")}{" "}
                    before disabling the account.
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
