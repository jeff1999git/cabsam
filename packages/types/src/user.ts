import type { ISODateTime, WithUsage } from "./common";

export const USER_ROLES = ["customer", "driver", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "disabled"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * Identity / profile. Never carries a password — credentials are owned by the auth backend
 * (a separate table in the mock store).
 */
export interface User {
  id: string;
  role: UserRole;
  name: string;
  /** Trimmed and lower-cased; unique across all roles. */
  email: string;
  /** 10-digit Indian mobile number without country code, e.g. `9847000000`. */
  mobile: string;
  status: AccountStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type Customer = User & { role: "customer" };
export type Driver = User & { role: "driver" };
export type Admin = User & { role: "admin" };

export type DriverWithUsage = Driver & WithUsage;

export type DriverRef = Pick<User, "id" | "name" | "mobile">;
export type UserRef = Pick<User, "id" | "name" | "email">;

export interface DriverListQuery {
  status?: AccountStatus;
  q?: string;
}

export interface CreateDriverInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
  status: AccountStatus;
}

/** PATCH semantics: omitted fields are unchanged (omitted password = keep current password). */
export type UpdateDriverInput = Partial<CreateDriverInput>;
