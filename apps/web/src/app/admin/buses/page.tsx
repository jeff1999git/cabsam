import type { Metadata } from "next";

import { AdminBusesScreen } from "@/features/admin/buses/buses-screen";

export const metadata: Metadata = { title: "Buses" };

export default function AdminBusesPage() {
  return <AdminBusesScreen />;
}
