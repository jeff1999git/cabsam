import type { UserRole } from "@excelcabs/types";
import type { Route } from "next";

/** Landing page of each role after signing in. */
export const ROLE_HOME = {
  customer: "/customer",
  driver: "/driver",
  admin: "/admin",
} as const satisfies Record<UserRole, string>;

/** Sign-in page of each role's portal. */
export const LOGIN_PATH = {
  customer: "/login",
  driver: "/staff/driver/login",
  admin: "/staff/admin/login",
} as const satisfies Record<UserRole, string>;

/** Paths a role may be sent back to after signing in (the path itself or anything below it). */
const ALLOWED_PREFIXES: Record<UserRole, readonly string[]> = {
  customer: ["/book", "/customer"],
  driver: ["/driver"],
  admin: ["/admin"],
};

/** Customers may also return to the public search page, which keeps its query string. */
const ALLOWED_EXACT: Record<UserRole, readonly string[]> = {
  customer: ["/"],
  driver: [],
  admin: [],
};

const PARSE_BASE = "http://excelcabs.invalid";

function isAllowedPath(pathname: string, role: UserRole): boolean {
  return (
    ALLOWED_EXACT[role].includes(pathname) ||
    ALLOWED_PREFIXES[role].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

/**
 * Validates a `?redirect=` value for a user of `role`. Only same-origin paths inside that role's
 * area are honoured; anything else (absolute or protocol-relative URLs, other roles' areas,
 * garbage) falls back to the role's home page.
 */
export function safeRedirect(param: string | null | undefined, role: UserRole): Route {
  const home: string = ROLE_HOME[role];
  if (!param || !param.startsWith("/") || param.startsWith("//") || param.includes("\\")) {
    return home as Route;
  }
  let url: URL;
  try {
    url = new URL(param, PARSE_BASE);
  } catch {
    return home as Route;
  }
  if (url.origin !== PARSE_BASE || !isAllowedPath(url.pathname, role)) return home as Route;
  return `${url.pathname}${url.search}${url.hash}` as Route;
}

/** The role's sign-in page, carrying `returnTo` as the `redirect` parameter when given. */
export function loginHref(role: UserRole, returnTo?: string): Route {
  const path: string = LOGIN_PATH[role];
  return (returnTo ? `${path}?redirect=${encodeURIComponent(returnTo)}` : path) as Route;
}
