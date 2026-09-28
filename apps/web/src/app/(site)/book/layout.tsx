import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/role-guard";

export default function BookLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role="customer">{children}</RoleGuard>;
}
