import type { Page } from "@playwright/test";

import { HOLIDAY, TOMORROW, expect, test } from "./fixtures";
import { ACCOUNTS, signIn, submitSignIn } from "./helpers/auth";
import { confirmAction, expectToast } from "./helpers/ui";

/** Customer journey: search, book, view, cancel; sign-up; holiday and full-trip states. */

const BOOKING_ID = /^EXC-\d{6}-\d{3,}$/;
/** "7:00 AM" in a table cell, "07:00" over "AM" in a time tile. */
const TIME_7AM = /0?7:00\s?AM/;

interface SearchInput {
  date?: string;
  from: string;
  to: string;
}

/** Runs a search through the home form (pickup first, since it resets the destination). */
async function searchTrips(page: Page, input: SearchInput) {
  await page.goto("/");
  const pickup = page.getByLabel("Select pickup");
  await expect(pickup).toBeEnabled();
  await pickup.selectOption({ label: input.from });
  await page.getByLabel("Select destination").selectOption({ label: input.to });
  if (input.date) await page.getByLabel("Select date").fill(input.date);
  await expect(page).toHaveURL(new RegExp(`from=${input.from.replaceAll(" ", "[+ ]")}`));
  await expect(page).toHaveURL(new RegExp(`to=${input.to}`));
  if (input.date) await expect(page).toHaveURL(new RegExp(`date=${input.date}`));
  return page.getByRole("region", { name: /available services/i });
}

test("home lists today's Shakthan Stand → SmartCity services with the first bookable trip selected", async ({ page }) => {
  const services = await searchTrips(page, { from: "Shakthan Stand", to: "SmartCity" });
  await expect(page.getByRole("heading", { level: 1, name: "Book Your Trip" })).toBeVisible();

  const rows = services.getByRole("listitem");
  const bus2 = rows.filter({ hasText: "Bus 2" });
  await expect(bus2).toHaveCount(1);
  await expect(bus2).toContainText(TIME_7AM);
  await expect(bus2).toContainText("KL-08-BE-7310");
  await expect(bus2).toContainText("Shakthan Stand");
  await expect(bus2).toContainText("SmartCity");
  await expect(bus2).toContainText("22 seats available");
  // The first bookable trip is pre-selected: marked row, "Selected →" button, Bus / Time field.
  await expect(rows.first()).toHaveText(/Bus 2/);
  await expect(bus2).toHaveAttribute("aria-current", "true");
  await expect(bus2.getByRole("button", { name: "Selected" })).toBeVisible();
  const tripSelect = page.getByLabel("Select bus / time");
  await expect(tripSelect.locator("option:checked")).toHaveText("7:00 AM — Bus 2 · 22 seats");
  const firstTripId = await tripSelect.inputValue();

  // Select on another trip moves the selection there.
  const bus4 = rows.filter({ hasText: "Bus 4" });
  await bus4.getByRole("button", { name: "Select", exact: true }).click();
  await expect(bus4).toHaveAttribute("aria-current", "true");
  await expect(bus4.getByRole("button", { name: "Selected" })).toBeVisible();
  await expect(bus2).not.toHaveAttribute("aria-current", "true");
  await expect(bus2.getByRole("button", { name: "Select", exact: true })).toBeVisible();
  await expect(tripSelect).not.toHaveValue(firstTripId);
  await expect(tripSelect.locator("option:checked")).toHaveText(/Bus 4/);
  await expect(page).toHaveURL(/trip=/);
});

test("a signed-out visitor books the 7:00 AM trip after signing in, then cancels it", async ({ page }) => {
  await searchTrips(page, { from: "Shakthan Stand", to: "SmartCity" });
  const tripSelect = page.getByLabel("Select bus / time");
  await expect(tripSelect).toBeEnabled();
  const tripId = await tripSelect.inputValue();

  // Continue while signed out → sign-in with a redirect back to the booking page.
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  expect(new URL(page.url()).searchParams.get("redirect")).toBe(`/book/${tripId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  await submitSignIn(page, ACCOUNTS.customer.email);
  await expect(page).toHaveURL(`/book/${tripId}`);

  // Passenger step, prefilled from the account.
  await expect(page.getByRole("heading", { level: 1, name: "Passenger details" })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(ACCOUNTS.customer.name);
  await expect(page.getByLabel("Mobile Number", { exact: true })).toHaveValue(ACCOUNTS.customer.mobile);
  await page.getByRole("button", { name: "Continue" }).click();

  // Review step.
  await expect(page.getByRole("heading", { level: 1, name: "Review your booking" })).toBeVisible();
  const review = page.getByRole("main");
  await expect(review).toContainText("Mon, 28 Sep 2026");
  await expect(review).toContainText("7:00 AM");
  await expect(review).toContainText("Shakthan Stand");
  await expect(review).toContainText("SmartCity");
  await expect(review).toContainText("Bus 2 · KL-08-BE-7310");
  await expect(review).toContainText("Arjun Nair · 98950 12345");
  await page.getByRole("button", { name: "Confirm Booking" }).click();

  // Confirmation.
  await expect(page.getByRole("heading", { level: 1, name: "Booking Confirmed" })).toBeVisible();
  await expect(review).toContainText("Booking ID");
  const bookingId = (await page.getByText(BOOKING_ID).textContent()) ?? "";
  expect(bookingId).toMatch(BOOKING_ID);
  await page.getByRole("link", { name: "View Booking" }).click();

  // Detail page → dashboard.
  await expect(page).toHaveURL(`/customer/bookings/${bookingId}`);
  await expect(page.getByRole("heading", { level: 1, name: `Booking ${bookingId}` })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Confirmed");
  await page.getByRole("main").getByRole("link", { name: "My bookings" }).click();
  await expect(page).toHaveURL("/customer");

  // Listed under Upcoming; cancel it.
  await expect(page.getByRole("tab", { name: /^Upcoming/ })).toHaveAttribute("aria-selected", "true");
  const card = page.getByRole("listitem").filter({ hasText: bookingId });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Confirmed");
  await card.getByRole("button", { name: "Cancel", exact: true }).click();
  await confirmAction(page, {
    title: `Cancel booking ${bookingId}?`,
    text: "will be released",
    confirm: "Cancel booking",
  });
  await expectToast(page, "Booking cancelled");
  await expect(card).toHaveCount(0);

  await page.getByRole("tab", { name: "Cancelled" }).click();
  const cancelled = page.getByRole("listitem").filter({ hasText: bookingId });
  await expect(cancelled).toBeVisible();
  await expect(cancelled).toContainText("Cancelled");
  await expect(cancelled.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
});

test("sign-up creates a customer account and lands on the dashboard", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await page.getByLabel("Full name").fill("Priya Menon");
  await page.getByLabel("Email", { exact: true }).fill("priya.menon@example.com");
  await page.getByLabel("Mobile Number", { exact: true }).fill("9876501234");
  await page.getByLabel("Password", { exact: true }).fill("shuttle-2026");
  await page.getByLabel("Confirm password", { exact: true }).fill("shuttle-2026");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/customer");
  await expect(page.getByRole("heading", { level: 1, name: "Hi, Priya" })).toBeVisible();
  await expectToast(page, "Welcome to Excel Cabs, Priya");
  await expect(page.getByText("No upcoming bookings")).toBeVisible();
});

test("a signed-in customer sees My Upcoming Bookings on the home page", async ({ page }) => {
  await signIn(page, "customer");
  await page.goto("/");
  const section = page.getByRole("region", { name: "My Upcoming Bookings" });
  await expect(section.getByRole("heading", { level: 2, name: "My Upcoming Bookings" })).toBeVisible();
  await expect(section).toContainText("3 Active Trips");
  await expect(section.getByRole("listitem")).toHaveCount(3);
  await expect(section.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/customer");
});

test("a holiday date shows the no-service banner instead of trips", async ({ page }) => {
  const services = await searchTrips(page, { date: HOLIDAY, from: "Shakthan Stand", to: "SmartCity" });
  await expect(services).toContainText("No service on 2 Oct — Gandhi Jayanti");
  await expect(services.getByRole("button", { name: "Check next day" })).toBeVisible();
  await expect(services.getByRole("listitem")).toHaveCount(0);
  await expect(page.getByText("No bookable trips for this search")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("a full trip is marked Full and cannot be selected", async ({ page }) => {
  const services = await searchTrips(page, { date: TOMORROW, from: "Shakthan Stand", to: "SmartCity" });
  const bus4 = services.getByRole("listitem").filter({ hasText: "Bus 4" });
  await expect(bus4).toHaveCount(1);
  await expect(bus4.getByText("Full", { exact: true })).toBeVisible();
  await expect(bus4.getByRole("button")).toHaveCount(0);
  // Bus 4 never appears in the Bus / Time picker; the 7:00 AM Bus 2 trip is selected instead.
  const tripSelect = page.getByLabel("Select bus / time");
  await expect(tripSelect.locator("option:checked")).toHaveText(/Bus 2/);
  await expect(tripSelect.locator("option", { hasText: "Bus 4" })).toHaveCount(0);
});
