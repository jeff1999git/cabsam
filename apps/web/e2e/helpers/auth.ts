import { expect, type Page } from "@playwright/test";

export type Role = "customer" | "driver" | "admin";

/** Shared password of every seeded account. */
export const DEMO_PASSWORD = "demo1234";

export const LOGIN_PATH: Record<Role, string> = {
  customer: "/login",
  driver: "/staff/driver/login",
  admin: "/staff/admin/login",
};

export const ROLE_HOME: Record<Role, string> = {
  customer: "/customer",
  driver: "/driver",
  admin: "/admin",
};

export const ACCOUNTS = {
  customer: { email: "customer@example.com", name: "Arjun Nair", mobile: "9895012345" },
  driver: { email: "driver@excelcabs.com", name: "Biju Thomas", mobile: "9847123456" },
  admin: { email: "admin@excelcabs.com", name: "Anitha Menon", mobile: "9446012345" },
} as const satisfies Record<Role, { email: string; name: string; mobile: string }>;

/** Seeded customer account used by the admin "Users" demo (0 bookings, active). */
export const TEST_CUSTOMER = { email: "test123@mailinator.com", name: "Test Test" } as const;

/** Fills and submits the sign-in form on the current page (does not wait for the outcome). */
export async function submitSignIn(page: Page, email: string, password = DEMO_PASSWORD): Promise<void> {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

interface SignInOptions {
  /** Sign-in page to use (defaults to the role's portal); may carry `?redirect=`. */
  path?: string;
  email?: string;
  password?: string;
}

/** Signs in through the real form and waits until the app has left the sign-in page. */
export async function signIn(page: Page, role: Role, options: SignInOptions = {}): Promise<void> {
  await page.goto(options.path ?? LOGIN_PATH[role]);
  await submitSignIn(page, options.email ?? ACCOUNTS[role].email, options.password);
  await page.waitForURL((url) => !url.pathname.includes("login"));
}

/** The sign-in form's error banner (field errors also carry role="alert", but stay empty). */
export function signInError(page: Page, text: string | RegExp) {
  return page.getByRole("alert").filter({ hasText: text });
}

/** Asserts a sign-in attempt was refused with `text` and the person stayed on the sign-in page. */
export async function expectSignInRefused(page: Page, text: string | RegExp): Promise<void> {
  await expect(signInError(page, text)).toBeVisible();
  await expect(page).toHaveURL(/login/);
}
