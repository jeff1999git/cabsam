import type { Metadata } from "next";
import { Suspense } from "react";

import { CenteredSpinner } from "@/components/common/centered-spinner";
import { AdminBookingsScreen } from "@/features/admin/bookings/bookings-screen";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<CenteredSpinner label="Loading bookings" />}>
      <AdminBookingsScreen />
    </Suspense>
  );
}
