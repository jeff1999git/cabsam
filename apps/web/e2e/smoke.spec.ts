import { expect, test } from "./fixtures";
import { signIn } from "./helpers/auth";
import { expectNoHorizontalOverflow } from "./helpers/ui";

/**
 * Every route renders its heading and never scrolls horizontally. Runs on all five viewports.
 * Each test is independent: a fresh context (fresh demo data) and its own sign-in.
 */

const BOOKING_ID = /^EXC-\d{6}-\d{3,}$/;

test.describe("public", () => {
  const routes = [
    { path: "/", heading: "Book Your Trip" },
    { path: "/login", heading: "Sign in" },
    { path: "/signup", heading: "Create your account" },
    { path: "/staff/driver/login", heading: "Driver sign in" },
    { path: "/staff/admin/login", heading: "Admin sign in" },
  ];

  for (const { path, heading } of routes) {
    test(`${path} renders "${heading}"`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("an unknown route renders the 404 page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book a trip" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("customer", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "customer");
  });

  test("/customer renders the dashboard", async ({ page }) => {
    await expect(page).toHaveURL("/customer");
    await expect(page.getByRole("heading", { level: 1, name: "Hi, Arjun" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("/customer/bookings/<id> renders a seeded booking", async ({ page }) => {
    await page.goto("/customer");
    const bookingId = await page.getByText(BOOKING_ID).first().textContent();
    expect(bookingId).toMatch(BOOKING_ID);
    await page.goto(`/customer/bookings/${bookingId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: `Booking ${bookingId}` }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("/book/<tripId> renders the passenger step", async ({ page }) => {
    await page.goto("/");
    const tripSelect = page.getByLabel("Select bus / time");
    await expect(tripSelect).toBeEnabled();
    const tripId = await tripSelect.inputValue();
    expect(tripId).not.toBe("");
    await page.goto(`/book/${tripId}`);
    await expect(page.getByRole("heading", { level: 1, name: "Passenger details" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("driver", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "driver");
  });

  test("/driver renders today's trips", async ({ page }) => {
    await expect(page).toHaveURL("/driver");
    await expect(page.getByRole("heading", { level: 1, name: "Today's Trips" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("/driver/trips/<id> renders a trip from the list", async ({ page }) => {
    await page.goto("/driver");
    const viewTrip = page.getByRole("link", { name: "View Trip" }).first();
    const href = await viewTrip.getAttribute("href");
    expect(href).toMatch(/^\/driver\/trips\/.+/);
    await viewTrip.click();
    await expect(page).toHaveURL(/\/driver\/trips\/.+/);
    await expect(
      page.getByRole("heading", { level: 1, name: /\d{1,2}:\d{2} (AM|PM)/ }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("admin", () => {
  const routes = [
    { path: "/admin", heading: "Dashboard" },
    { path: "/admin/bookings", heading: "Bookings" },
    { path: "/admin/trips", heading: "Trips" },
    { path: "/admin/buses", heading: "Buses" },
    { path: "/admin/drivers", heading: "Drivers" },
    { path: "/admin/users", heading: "Users" },
    { path: "/admin/holidays", heading: "Holidays" },
  ];

  test.beforeEach(async ({ page }) => {
    await signIn(page, "admin");
  });

  for (const { path, heading } of routes) {
    test(`${path} renders "${heading}"`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
