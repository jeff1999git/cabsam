"use client";

import { Button } from "@excelcabs/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { toast } from "@excelcabs/ui/components/sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { PasswordInput } from "@/components/auth/password-input";
import { applyServiceError } from "@/lib/form";
import { safeRedirect } from "@/lib/safe-redirect";
import { signUpFormSchema, type SignUpFormValues } from "@/lib/schemas/auth";
import { useSignUp } from "@/queries/auth";

interface SignUpFormProps {
  /** Raw `?redirect=` value; validated with `safeRedirect` before use. */
  redirectParam: string | null;
}

/** Customer sign-up; the new customer is signed in and sent on to their booking or dashboard. */
export function SignUpForm({ redirectParam }: SignUpFormProps) {
  const id = useId();
  const router = useRouter();
  const signUp = useSignUp();
  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { name: "", email: "", mobile: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async ({ confirmPassword: _confirm, ...input }) => {
    try {
      const session = await signUp.mutateAsync(input);
      toast.success(`Welcome to Excel Cabs, ${session.user.name.split(" ")[0] ?? session.user.name}`);
      router.replace(safeRedirect(redirectParam, "customer"));
    } catch (error) {
      // Field errors (e.g. email taken) land on the form; anything else was toasted globally.
      applyServiceError(error, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-name`}>Full name</FieldLabel>
              <Input
                {...field}
                id={`${id}-name`}
                autoComplete="name"
                placeholder="Arjun Nair"
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
                autoComplete="email"
                placeholder="you@example.com"
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
              <FieldLabel htmlFor={`${id}-mobile`}>Mobile number</FieldLabel>
              <Input
                {...field}
                id={`${id}-mobile`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                icon={<Phone />}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>We use it to reach you about your bookings.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
              <PasswordInput
                {...field}
                id={`${id}-password`}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-confirm`}>Confirm password</FieldLabel>
              <PasswordInput
                {...field}
                id={`${id}-confirm`}
                autoComplete="new-password"
                placeholder="Repeat your password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>
        Create account
      </Button>
    </form>
  );
}
