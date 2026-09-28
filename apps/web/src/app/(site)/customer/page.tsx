import type { Metadata } from "next";

import { CustomerDashboardScreen } from "@/features/customer/dashboard-screen";

export const metadata: Metadata = { title: "My bookings" };

export default function CustomerDashboardPage() {
  return <CustomerDashboardScreen />;
}
