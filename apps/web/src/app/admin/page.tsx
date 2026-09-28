import type { Metadata } from "next";

import { AdminDashboardScreen } from "@/features/admin/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "Admin dashboard" };

export default function AdminDashboardPage() {
  return <AdminDashboardScreen />;
}
