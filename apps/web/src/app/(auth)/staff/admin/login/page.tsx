import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginScreen } from "@/components/auth/login-screen";
import { CenteredSpinner } from "@/components/common/centered-spinner";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<CenteredSpinner className="min-h-64" />}>
      <LoginScreen role="admin" />
    </Suspense>
  );
}
