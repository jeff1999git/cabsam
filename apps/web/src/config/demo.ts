import type { UserRole } from "@excelcabs/types";

/** Shared password of every seeded account. Demo data only. */
export const DEMO_PASSWORD = "demo1234";

export interface DemoAccount {
  role: UserRole;
  email: string;
  label: string;
}

export const DEMO_ACCOUNTS = {
  customer: { role: "customer", email: "customer@example.com", label: "Customer" },
  driver: { role: "driver", email: "driver@excelcabs.com", label: "Driver" },
  admin: { role: "admin", email: "admin@excelcabs.com", label: "Admin" },
} as const satisfies Record<UserRole, DemoAccount>;
