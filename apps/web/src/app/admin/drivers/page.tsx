import type { Metadata } from "next";

import { AdminDriversScreen } from "@/features/admin/drivers/drivers-screen";

export const metadata: Metadata = { title: "Drivers" };

export default function AdminDriversPage() {
  return <AdminDriversScreen />;
}
