import { expect, test } from "./fixtures";
import { signIn } from "./helpers/auth";
import { expectNoHorizontalOverflow } from "./helpers/ui";

/** Phone-width behaviour (mobile projects only): menus, card lists and the sticky action bar. */

test("the hamburger opens the site menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Book Your Trip" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(0);

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  for (const name of ["Sign In", "Sign Up", "Driver Login", "Admin Login"]) {
    await expect(menu.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await menu.getByRole("link", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await expect(menu).toBeHidden();
});

test("the admin hamburger opens the navigation sheet", async ({ page }) => {
  await signIn(page, "admin");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("complementary")).toHaveCount(0);

  await page.getByRole("button", { name: "Open menu" }).click();
  const sheet = page.getByRole("dialog", { name: "Admin menu" });
  await expect(sheet).toBeVisible();
  const nav = sheet.getByRole("navigation", { name: "Admin" });
  for (const name of ["Dashboard", "Bookings", "Trips", "Buses", "Drivers", "Users", "Holidays"]) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(sheet.getByRole("button", { name: "Reset demo data" })).toBeVisible();
  await nav.getByRole("link", { name: "Buses", exact: true }).click();
  await expect(page).toHaveURL("/admin/buses");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Buses" })).toBeVisible();
});

test("admin lists render as cards, not tables", async ({ page }) => {
  await signIn(page, "admin");
  for (const path of ["/admin/buses", "/admin/drivers", "/admin/users", "/admin/trips", "/admin/bookings"]) {
    await page.goto(path);
    await expect(page.getByRole("listitem").first()).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  await page.goto("/admin/buses");
  const bus2 = page.getByRole("listitem").filter({ hasText: "Bus 2" });
  await expect(bus2).toBeVisible();
  await expect(bus2).toContainText("KL-08-BE-7310");
  await expect(bus2.getByRole("button", { name: "Edit Bus 2" })).toBeVisible();
});

test("the driver trip action bar is visible without horizontal scrolling", async ({ page }) => {
  await signIn(page, "driver");
  // Scope to today's list: the Upcoming section can load first, and its trips cannot be started yet.
  await page.getByRole("region", { name: "Today" }).getByRole("link", { name: "View Trip" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /\d{1,2}:\d{2} (AM|PM)/ })).toBeVisible();
  const start = page.getByRole("button", { name: "Start Trip" });
  await expect(start).toBeVisible();
  await expect(start).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  // Still in view after scrolling through the manifest (sticky bottom bar).
  await page.getByText("Passengers (", { exact: false }).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  await expect(start).toBeInViewport();
  const box = await start.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
});
