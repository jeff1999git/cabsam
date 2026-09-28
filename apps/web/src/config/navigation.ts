import type { UserRole } from "@excelcabs/types";
import {
  BusFront,
  CalendarDays,
  CalendarOff,
  IdCard,
  LayoutDashboard,
  type LucideIcon,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import type { Route } from "next";

import { LOGIN_PATH } from "@/lib/safe-redirect";

export interface NavItem {
  label: string;
  href: Route;
  icon: LucideIcon;
  /** Active only on the exact path (index pages such as `/admin`), not on paths below it. */
  exact?: boolean;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  customer: "Customer",
  driver: "Driver",
  admin: "Admin",
};

export const ADMIN_NAV: readonly NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Bookings", href: "/admin/bookings", icon: Ticket },
  { label: "Trips", href: "/admin/trips", icon: CalendarDays },
  { label: "Buses", href: "/admin/buses", icon: BusFront },
  { label: "Drivers", href: "/admin/drivers", icon: IdCard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Holidays", href: "/admin/holidays", icon: CalendarOff },
];

export const CUSTOMER_NAV: readonly NavItem[] = [
  { label: "Book a trip", href: "/", icon: Search, exact: true },
  { label: "My bookings", href: "/customer", icon: Ticket },
];

/** Staff sign-in links shown to signed-out visitors of the customer site. */
export const STAFF_LOGIN_LINKS: readonly NavItem[] = [
  { label: "Driver Login", href: LOGIN_PATH.driver, icon: BusFront },
  { label: "Admin Login", href: LOGIN_PATH.admin, icon: ShieldCheck },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
