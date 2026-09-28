import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/role-guard";
import { AdminShell } from "@/components/layout/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="admin">
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}
