import type { Metadata } from "next";
import { Suspense } from "react";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { AdminTripsScreen } from "@/features/admin/trips/trips-screen";

export const metadata: Metadata = { title: "Trips" };

export default function AdminTripsPage() {
  return (
    <Suspense fallback={<CenteredSpinner label="Loading trips" />}>
      <AdminTripsScreen />
    </Suspense>
  );
}
