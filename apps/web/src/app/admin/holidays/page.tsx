import type { Metadata } from "next";

import { AdminHolidaysScreen } from "@/features/admin/holidays/holidays-screen";

export const metadata: Metadata = { title: "Holidays" };

export default function AdminHolidaysPage() {
  return <AdminHolidaysScreen />;
}
