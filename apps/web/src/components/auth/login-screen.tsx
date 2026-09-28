"use client";

import type { UserRole } from "@excelcabs/types";
import { eyebrowClassName } from "@excelcabs/ui/lib/styles";
import { cn } from "@excelcabs/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { LOGIN_PATH } from "@/lib/safe-redirect";

import { LoginForm } from "./login-form";
import { useRedirectIfSignedIn } from "./use-redirect-if-signed-in";

const COPY: Record<UserRole, { title: string; description: string }> = {
  customer: { title: "Sign in", description: "Book and manage your shuttle trips" },
  driver: { title: "Driver sign in", description: "See your assigned trips and passengers" },
  admin: { title: "Admin sign in", description: "Manage trips, buses, drivers and bookings" },
};

const linkClassName =
  "font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline";

/** Sign-in page body for one portal. Reads `?redirect=`, so render it inside `<Suspense>`. */
export function LoginScreen({ role }: { role: UserRole }) {
  const redirectParam = useSearchParams().get("redirect");
  const redirecting = useRedirectIfSignedIn(redirectParam);
  const { title, description } = COPY[role];

  if (redirecting) return <CenteredSpinner label="Taking you to your account" className="min-h-64" />;

  const signupHref: Route = redirectParam
    ? (`/signup?redirect=${encodeURIComponent(redirectParam)}` as Route)
    : "/signup";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {role !== "customer" ? (
          <p className={cn(eyebrowClassName, "text-primary")}>Staff portal</p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <LoginForm role={role} redirectParam={redirectParam} />

      {role === "customer" ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            New to Excel Cabs?{" "}
            <Link href={signupHref} className={linkClassName}>
              Create an account
            </Link>
          </p>
          <p className="border-t pt-4 text-center text-xs text-muted-foreground">
            Staff?{" "}
            <Link href={LOGIN_PATH.driver} className="font-medium hover:text-foreground">
              Driver sign in
            </Link>{" "}
            ·{" "}
            <Link href={LOGIN_PATH.admin} className="font-medium hover:text-foreground">
              Admin sign in
            </Link>
          </p>
        </div>
      ) : (
        <p className="text-center text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Excel Cabs
          </Link>
        </p>
      )}
    </div>
  );
}
