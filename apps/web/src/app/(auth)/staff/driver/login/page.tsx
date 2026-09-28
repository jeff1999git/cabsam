import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginScreen } from "@/components/auth/login-screen";
import { CenteredSpinner } from "@/components/common/centered-spinner";

export const metadata: Metadata = { title: "Driver sign in" };

export default function DriverLoginPage() {
  return (
    <Suspense fallback={<CenteredSpinner className="min-h-64" />}>
      <LoginScreen role="driver" />
    </Suspense>
  );
}
