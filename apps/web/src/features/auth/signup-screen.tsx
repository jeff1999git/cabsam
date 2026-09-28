"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useRedirectIfSignedIn } from "@/components/auth/use-redirect-if-signed-in";
import { CenteredSpinner } from "@/components/common/centered-spinner";

import { SignUpForm } from "./signup-form";

/** Sign-up page body. Reads `?redirect=`, so render it inside `<Suspense>`. */
export function SignUpScreen() {
  const redirectParam = useSearchParams().get("redirect");
  const redirecting = useRedirectIfSignedIn(redirectParam);

  if (redirecting) return <CenteredSpinner label="Taking you to your account" className="min-h-64" />;

  const loginHref: Route = redirectParam
    ? (`/login?redirect=${encodeURIComponent(redirectParam)}` as Route)
    : "/login";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Book shuttle seats in a few taps.</p>
      </div>

      <SignUpForm redirectParam={redirectParam} />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
