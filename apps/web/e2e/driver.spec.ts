import { TODAY, expect, openSecondDevice, test } from "./fixtures";
import { signIn } from "./helpers/auth";
import { confirmAction, expectToast, listRow } from "./helpers/ui";

/** Driver portal: today's trips, the passenger manifest, start / complete, and access rules. */

/** "7:00 AM" in a table cell, "07:00" over "AM" in a time tile. */
const TIME_7AM = /0?7:00\s?AM/;

test("today's 7:00 AM Bus 2 trip can be viewed, started and completed", async ({ page }) => {
  await signIn(page, "driver");
  await expect(page).toHaveURL("/driver");
  await expect(page.getByRole("heading", { level: 1, name: "Today's Trips" })).toBeVisible();

  const today = page.getByRole("region", { name: "Today" });
  const card = today.getByRole("listitem").filter({ hasText: "Bus 2" }).filter({ hasText: TIME_7AM });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Shakthan Stand");
  await expect(card).toContainText("SmartCity");
  await expect(card).toContainText("KL-08-BE-7310");
  await expect(card).toContainText("18 / 40 passengers");
  await expect(card).toContainText("Upcoming");
  await card.getByRole("link", { name: "View Trip" }).click();

  await expect(page).toHaveURL(/\/driver\/trips\/.+/);
  await expect(page.getByRole("heading", { level: 1, name: /7:00 AM/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Shakthan Stand");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("SmartCity");
  await expect(page.getByText("Passengers (18)")).toBeVisible();
  await expect(page.getByText("18 / 40 booked")).toBeVisible();

  // Manifest with tap-to-call links.
  await expect(page.getByRole("link", { name: "Call Surya" })).toHaveAttribute("href", "tel:+919947963408");
  await expect(page.getByRole("link", { name: "Call Rahul" })).toHaveAttribute("href", "tel:+919876543210");
  await expect(page.getByRole("link", { name: "Call Anu" })).toHaveAttribute("href", "tel:+919847000000");
  await expect(page.getByText("Surya", { exact: true })).toBeVisible();
  // Each passenger's own typed stops along the corridor.
  const rahul = page.getByRole("listitem").filter({ hasText: "Rahul" });
  await expect(rahul).toContainText("Chalakudy → Kakkanad");

  // Start.
  await page.getByRole("button", { name: "Start Trip" }).click();
  await confirmAction(page, {
    title: "Start this trip?",
    text: "18 passengers",
    confirm: "Start trip",
  });
  await expectToast(page, "Trip started");
  await expect(page.getByText("In Progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Trip in progress")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Trip" })).toHaveCount(0);

  // Complete.
  await page.getByRole("button", { name: "Complete Trip" }).click();
  await confirmAction(page, { title: "Complete this trip?", confirm: "Complete trip" });
  await expectToast(page, "Trip completed");
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByText("Trip completed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Complete Trip" })).toHaveCount(0);
});

test("another driver's trip is not found", async ({ browser, page }) => {
  // Look the trip up as the admin on another device: today's 7:30 AM trip is Suresh Kumar's.
  const admin = await openSecondDevice(browser, page);
  await signIn(admin.page, "admin");
  await admin.page.goto(`/admin/trips?date=${TODAY}`);
  const sureshTrip = listRow(admin.page, "Suresh Kumar").first();
  await expect(sureshTrip).toBeVisible();
  await sureshTrip.getByRole("button", { name: "View", exact: true }).click();
  await expect(admin.page).toHaveURL(/[?&]trip=/);
  const otherTripId = new URL(admin.page.url()).searchParams.get("trip") ?? "";
  expect(otherTripId).not.toBe("");
  await expect(admin.page.getByRole("dialog")).toContainText("Suresh Kumar");
  await admin.context.close();

  await signIn(page, "driver");
  await page.goto(`/driver/trips/${otherTripId}`);
  await expect(page.getByText("Trip not found")).toBeVisible();
  await expect(page.getByText("not assigned to you")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to today's trips" })).toHaveAttribute("href", "/driver");
  await expect(page.getByRole("button", { name: "Start Trip" })).toHaveCount(0);
});

test("the driver area redirects signed-out visitors to the driver sign-in", async ({ page }) => {
  await page.goto("/driver");
  await expect(page).toHaveURL(/\/staff\/driver\/login\?redirect=%2Fdriver$/);
  await expect(page.getByRole("heading", { level: 1, name: "Driver sign in" })).toBeVisible();
});
