import type { Metadata } from "next";
import { Suspense } from "react";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { SignUpScreen } from "@/features/auth/signup-screen";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<CenteredSpinner className="min-h-64" />}>
      <SignUpScreen />
    </Suspense>
  );
}
