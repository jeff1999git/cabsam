import type { Metadata } from "next";

import { AdminUsersScreen } from "@/features/admin/users/users-screen";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <AdminUsersScreen />;
}
