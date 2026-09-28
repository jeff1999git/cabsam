import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/role-guard";
import { DriverShell } from "@/components/layout/driver-shell";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role="driver">
      <DriverShell>{children}</DriverShell>
    </RoleGuard>
  );
}
