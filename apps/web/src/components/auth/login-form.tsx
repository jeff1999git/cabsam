"use client";

import { USER_ROLES, type UserRole } from "@excelcabs/types";
import { Alert, AlertDescription, AlertTitle } from "@excelcabs/ui/components/alert";
import { Button } from "@excelcabs/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@excelcabs/ui/components/field";
import { Input } from "@excelcabs/ui/components/input";
import { toast } from "@excelcabs/ui/components/sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { DEMO_ACCOUNTS } from "@/config/demo";
import { ROLE_LABEL } from "@/config/navigation";
import { LOGIN_PATH, safeRedirect } from "@/lib/safe-redirect";
import { signInSchema, type SignInValues } from "@/lib/schemas/auth";
import { useSignIn } from "@/queries/auth";
import { errorMessage, isServiceError } from "@/services/errors";

import { DemoCredentials } from "./demo-credentials";
import { PasswordInput } from "./password-input";

/** The portal a WRONG_PORTAL error points to, when the service attached one. */
function wrongPortalOf(error: unknown): UserRole | null {
  if (!isServiceError(error) || error.reason !== "WRONG_PORTAL") return null;
  const details = error.details;
  if (typeof details !== "object" || details === null || !("portal" in details)) return null;
  const portal = details.portal;
  return USER_ROLES.find((role) => role === portal) ?? null;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

interface LoginFormProps {
  /** The portal: only accounts of this role can sign in here. */
  role: UserRole;
  /** Raw `?redirect=` value; validated with `safeRedirect` before use. */
  redirectParam: string | null;
}

export function LoginForm({ role, redirectParam }: LoginFormProps) {
  const id = useId();
  const router = useRouter();
  const signIn = useSignIn();
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    // mutateAsync: the success side effects must run even if the page swaps this form for a
    // "redirecting" state as soon as the session appears.
    try {
      const session = await signIn.mutateAsync({ ...values, portal: role });
      toast.success(`Welcome back, ${firstName(session.user.name)}`);
      router.replace(safeRedirect(redirectParam, role));
    } catch {
      // Rendered below from `signIn.error`.
    }
  });

  const wrongPortal = wrongPortalOf(signIn.error);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {signIn.isError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{errorMessage(signIn.error)}</AlertTitle>
          {wrongPortal ? (
            <AlertDescription>
              <Link href={LOGIN_PATH[wrongPortal]} className="font-medium underline underline-offset-4">
                Go to {ROLE_LABEL[wrongPortal]} sign in
              </Link>
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}

      <FieldGroup>
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
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${id}-password`}>Password</FieldLabel>
              <PasswordInput
                {...field}
                id={`${id}-password`}
                autoComplete="current-password"
                placeholder="Your password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" size="lg" className="w-full" loading={signIn.isPending}>
        Sign in
      </Button>

      <DemoCredentials
        account={DEMO_ACCOUNTS[role]}
        onUse={({ email, password }) => {
          form.clearErrors();
          form.setValue("email", email, { shouldDirty: true });
          form.setValue("password", password, { shouldDirty: true });
          form.setFocus("password");
        }}
      />
    </form>
  );
}
