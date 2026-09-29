import { DAY_AFTER_TOMORROW, SUNDAY, TODAY, TOMORROW, expect, openSecondDevice, test } from "./fixtures";
import { ACCOUNTS, TEST_CUSTOMER, expectSignInRefused, signIn, submitSignIn } from "./helpers/auth";
import {
  confirmAction,
  expectToast,
  listRow,
  openAdminSidebar,
  selectOptionContaining,
} from "./helpers/ui";

/** Admin portal: dashboard, catalogues (buses, drivers, users, holidays), trips and bookings. */

const BOOKING_ID = /EXC-\d{6}-\d{3,}/;
/** "7:00 AM" in a table cell, "07:00" over "AM" in a time tile. */
const TIME_7AM = /0?7:00\s?AM/;

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "admin");
  });

  test("dashboard shows today's figures", async ({ page }) => {
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Mon, 28 Sep 2026")).toBeVisible();
    for (const label of ["Today's Trips", "Today's Bookings", "Active Buses", "Active Drivers"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/^\d+ in progress · \d+ upcoming$/)).toBeVisible();
    await expect(page.getByText(/^\d+ booked today$/)).toBeVisible();
    await expect(page.getByText("of 6 buses", { exact: true })).toBeVisible();
    await expect(page.getByText("of 6 drivers", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's schedule" })).toBeVisible();
    await expect(listRow(page, "Bus 2").filter({ hasText: TIME_7AM })).toContainText("18 / 40");
    await expect(page.getByRole("heading", { name: "Recent bookings" })).toBeVisible();
    await expect(page.getByText("Next holiday: Fri, 2 Oct 2026 — Gandhi Jayanti")).toBeVisible();
  });

  test.describe("buses", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/buses");
      await expect(page.getByRole("heading", { level: 1, name: "Buses" })).toBeVisible();
    });

    test("add a bus (no route), then edit its capacity", async ({ page }) => {
      await expect(page.getByRole("columnheader", { name: "Route" })).toHaveCount(0);
      await page.getByRole("button", { name: "Add Bus" }).click();
      const dialog = page.getByRole("dialog", { name: "Add bus" });
      await expect(dialog).toBeVisible();
      // The next free "Bus N" is suggested; buses carry no route or duration.
      await expect(dialog.getByLabel("Bus Name")).toHaveValue("Bus 7");
      await expect(dialog.getByLabel("From", { exact: true })).toHaveCount(0);
      await dialog.getByLabel("Registration Number").fill("kl-08-zz-1111");
      await expect(dialog.getByLabel("Registration Number")).toHaveValue("KL-08-ZZ-1111");
      await dialog.getByLabel("Capacity", { exact: true }).fill("30");
      await dialog.getByRole("button", { name: "Add bus", exact: true }).click();
      await expectToast(page, "Bus 7 added");
      await expect(dialog).toBeHidden();

      const row = listRow(page, "Bus 7");
      await expect(row).toHaveCount(1);
      for (const text of ["KL-08-ZZ-1111", "30 seats"]) {
        await expect(row).toContainText(text);
      }
      await expect(row.getByText("Active", { exact: true })).toBeVisible();

      await row.getByRole("button", { name: "Edit Bus 7" }).click();
      const edit = page.getByRole("dialog", { name: "Edit bus" });
      await expect(edit).toBeVisible();
      await expect(edit.getByLabel("Capacity", { exact: true })).toHaveValue("30");
      await edit.getByLabel("Capacity", { exact: true }).fill("35");
      await edit.getByRole("button", { name: "Save changes" }).click();
      await expectToast(page, "Bus 7 updated");
      await expect(edit).toBeHidden();
      await expect(row).toContainText("35 seats");
    });

    test("disabling Bus 2 is blocked by its upcoming trips", async ({ page }) => {
      await page.getByRole("button", { name: "Disable Bus 2" }).click();
      const blocked = page.getByRole("dialog", { name: "Can't disable Bus 2 yet" });
      await expect(blocked).toBeVisible();
      await expect(blocked).toContainText(/Bus 2 has \d+ upcoming trips\. Reassign or cancel them/);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await blocked.getByRole("link", { name: "View trips" }).click();

      await expect(page).toHaveURL(/\/admin\/trips\?busId=/);
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      await expect(page.getByText("Bus: Bus 2")).toBeVisible();
      await expect(listRow(page, "Bus 2").first()).toBeVisible();
      await expect(listRow(page, "Bus 1")).toHaveCount(0);
    });

    test("disable and re-enable the spare Bus 5", async ({ page }) => {
      const row = listRow(page, "Bus 5");
      await expect(row.getByText("Active", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Disable Bus 5" }).click();
      await confirmAction(page, {
        title: "Disable Bus 5?",
        text: "can't be assigned to new trips",
        confirm: "Disable",
      });
      await expectToast(page, "Bus 5 disabled");
      await expect(row.getByText("Inactive", { exact: true })).toBeVisible();

      await row.getByRole("button", { name: "Enable Bus 5" }).click();
      await expectToast(page, "Bus 5 enabled");
      await expect(row.getByText("Active", { exact: true })).toBeVisible();
      await expect(row.getByRole("button", { name: "Disable Bus 5" })).toBeVisible();
    });
  });

  test.describe("drivers", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/admin/drivers");
      await expect(page.getByRole("heading", { level: 1, name: "Drivers" })).toBeVisible();
    });

    test("a newly added driver can sign in at the driver portal", async ({ browser, page }) => {
      const driver = { name: "Ravi Menon", email: "ravi.menon@excelcabs.com", password: "wheels-2026" };
      await page.getByRole("button", { name: "Add Driver" }).click();
      const dialog = page.getByRole("dialog", { name: "Add driver" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Name", { exact: true }).fill(driver.name);
      await dialog.getByLabel("Email", { exact: true }).fill(driver.email);
      await dialog.getByLabel("Mobile", { exact: true }).fill("9744123456");
      await dialog.getByLabel("Password", { exact: true }).fill(driver.password);
      await dialog.getByRole("button", { name: "Add driver", exact: true }).click();
      await expectToast(page, "Driver added");
      await expect(dialog).toBeHidden();

      const row = listRow(page, driver.name);
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(driver.email);
      await expect(row).toContainText("97441 23456");
      await expect(row.getByText("Active", { exact: true })).toBeVisible();

      const device = await openSecondDevice(browser, page);
      await signIn(device.page, "driver", { email: driver.email, password: driver.password });
      await expect(device.page).toHaveURL("/driver");
      await expect(device.page.getByRole("heading", { level: 1, name: "Today's Trips" })).toBeVisible();
      await expect(device.page.getByText("No trips assigned today")).toBeVisible();
      await expect(device.page.getByRole("button", { name: `Account menu for ${driver.name}` })).toBeVisible();
      await device.context.close();
    });

    test("disable the spare driver Shaji Paul", async ({ page }) => {
      const row = listRow(page, "Shaji Paul");
      await expect(row.getByText("Active", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Disable Shaji Paul" }).click();
      await confirmAction(page, {
        title: "Disable Shaji Paul?",
        text: "won't be able to sign in",
        confirm: "Disable",
      });
      await expectToast(page, "Shaji Paul disabled");
      await expect(row.getByText("Disabled", { exact: true })).toBeVisible();
      await expect(row.getByRole("button", { name: "Enable Shaji Paul" })).toBeVisible();
    });
  });

  test.describe("trips", () => {
    test("create a one-time trip for tomorrow, then move its departure time", async ({ page }) => {
      await page.goto("/admin/trips");
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      await page.getByRole("button", { name: "Create Trip" }).click();
      const dialog = page.getByRole("dialog", { name: "Create trip" });
      await expect(dialog).toBeVisible();
      const bus = dialog.getByLabel("Bus", { exact: true });
      await expect(bus).toBeEnabled();
      await selectOptionContaining(bus, "Bus 5");
      await dialog.getByLabel("Driver", { exact: true }).selectOption({ label: "Shaji Paul" });
      await dialog.getByLabel("From", { exact: true }).fill("Guruvayur");
      await dialog.getByLabel("To", { exact: true }).fill("Shakthan Stand");
      await dialog.getByLabel("Departure time").fill("10:00");
      await dialog.getByLabel("Arrival time").fill("11:30");
      await expect(dialog.getByRole("button", { name: "One-time" })).toHaveAttribute("aria-pressed", "true");
      await dialog.getByLabel("Date", { exact: true }).fill(TOMORROW);
      await expect(dialog.getByRole("status").filter({ hasText: "Creates 1 trip" })).toBeVisible();
      await dialog.getByRole("button", { name: "Create trip", exact: true }).click();
      await expectToast(page, "Trip created");
      await expect(dialog).toBeHidden();

      const row = listRow(page, "Bus 5");
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("10:00");
      await expect(row).toContainText("11:30");
      await expect(row).toContainText("KL-07-DA-1186");
      await expect(row).toContainText("Guruvayur");
      await expect(row).toContainText("Shakthan Stand");
      await expect(row).toContainText("Shaji Paul");
      await expect(row).toContainText("0 / 17");
      await expect(row).not.toContainText("Repeats");
      await expect(row.getByText("Upcoming", { exact: true })).toBeVisible();

      await row.getByRole("button", { name: "Edit", exact: true }).click();
      const edit = page.getByRole("dialog", { name: "Edit trip" });
      await expect(edit).toBeVisible();
      const time = edit.getByLabel("Departure time");
      await expect(time).toHaveValue("10:00");
      await expect(edit.getByLabel("Date", { exact: true })).toHaveValue(TOMORROW);
      await expect(edit.getByRole("button", { name: "Repeating" })).toHaveCount(0);
      await time.fill("10:30");
      await edit.getByRole("button", { name: "Save changes" }).click();
      await expectToast(page, "Trip updated");
      await expect(edit).toBeHidden();
      await expect(row).toContainText("10:30");

      // It is scheduled on the right day.
      await page.goto(`/admin/trips?date=${TOMORROW}`);
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      await expect(listRow(page, "Bus 5")).toContainText("10:30");
      await expect(listRow(page, "Bus 5")).toContainText("Shaji Paul");
    });

    test("a repeating trip skips Sundays and holidays, and its later trips cancel together", async ({ page }) => {
      await page.goto("/admin/trips");
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      await page.getByRole("button", { name: "Create Trip" }).click();
      const dialog = page.getByRole("dialog", { name: "Create trip" });
      await expect(dialog).toBeVisible();
      await selectOptionContaining(dialog.getByLabel("Bus", { exact: true }), "Bus 5");
      await dialog.getByLabel("Driver", { exact: true }).selectOption({ label: "Shaji Paul" });
      await dialog.getByLabel("From", { exact: true }).fill("Guruvayur");
      await dialog.getByLabel("To", { exact: true }).fill("Infopark");
      await dialog.getByLabel("Departure time").fill("14:00");
      await dialog.getByLabel("Arrival time").fill("15:30");
      await dialog.getByRole("button", { name: "Repeating" }).click();
      await dialog.getByLabel("Start date").fill(TOMORROW);
      await dialog.getByLabel("Repeat until").fill("2026-10-17");
      // Mon–Sat by default; Sunday can't be picked.
      for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
        await expect(dialog.getByRole("button", { name: day, exact: true })).toHaveAttribute("aria-pressed", "true");
      }
      await expect(dialog.getByRole("button", { name: "Sun", exact: true })).toBeDisabled();
      // 29 Sep – 17 Oct, Mon–Sat, without Sun 4 / 11 Oct (never weekdays) and Gandhi Jayanti.
      await expect(dialog.getByRole("status").filter({ hasText: "Creates 16 trips" })).toContainText(
        "skips Fri, 2 Oct (Gandhi Jayanti)",
      );
      await dialog.getByRole("button", { name: "Create trip", exact: true }).click();
      await expectToast(page, "16 trips created");
      await expect(dialog).toBeHidden();

      await page.goto(`/admin/trips?date=${TOMORROW}`);
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      const row = listRow(page, "Bus 5");
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("Repeats");
      await expect(row).toContainText("Guruvayur");

      await row.getByRole("button", { name: "Cancel", exact: true }).click();
      const confirm = page.getByRole("alertdialog");
      await expect(confirm).toBeVisible();
      await confirm.getByRole("radio", { name: "This and later trips in the series (16 trips)" }).check();
      await confirmAction(page, {
        title: /^Cancel the 2:00 PM Guruvayur → Infopark trip on 29 Sep\?$/,
        text: "Every confirmed booking on these trips will be cancelled",
        confirm: "Cancel trips",
      });
      await expectToast(page, "16 trips cancelled");
      await expect(row.getByText("Cancelled", { exact: true })).toBeVisible();

      await page.goto("/admin/trips?date=2026-10-17");
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      await expect(listRow(page, "Bus 5").getByText("Cancelled", { exact: true })).toBeVisible();
    });

    test("a repeating trip that clashes with the schedule creates nothing", async ({ page }) => {
      await page.goto("/admin/trips?create=1");
      const dialog = page.getByRole("dialog", { name: "Create trip" });
      await expect(dialog).toBeVisible();
      await selectOptionContaining(dialog.getByLabel("Bus", { exact: true }), "Bus 2");
      await dialog.getByLabel("Driver", { exact: true }).selectOption({ label: "Shaji Paul" });
      await dialog.getByLabel("From", { exact: true }).fill("Shakthan Stand");
      await dialog.getByLabel("To", { exact: true }).fill("SmartCity");
      await dialog.getByLabel("Departure time").fill("07:30");
      await dialog.getByLabel("Arrival time").fill("09:00");
      await dialog.getByRole("button", { name: "Repeating" }).click();
      await dialog.getByLabel("Start date").fill(TOMORROW);
      await expect(dialog.getByRole("status").filter({ hasText: /Creates \d+ trips/ })).toBeVisible();
      await dialog.getByRole("button", { name: "Create trip", exact: true }).click();
      const alert = dialog.getByRole("alert").filter({ hasText: "Schedule conflict" });
      await expect(alert).toContainText("no trips were created");
      await expect(alert).toContainText(/Bus 2 is busy on 29 Sep/);
      await expect(dialog).toBeVisible();
    });

    test("cancelling a booked trip cancels its bookings", async ({ page }) => {
      await page.goto(`/admin/trips?date=${TODAY}`);
      await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
      const row = listRow(page, "Bus 2").filter({ hasText: TIME_7AM });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText("18 / 40");
      await row.getByRole("button", { name: "Cancel", exact: true }).click();
      await confirmAction(page, {
        title: /^Cancel the 7:00 AM Shakthan Stand → SmartCity trip on 28 Sep\?$/,
        text: "18 confirmed bookings will be cancelled",
        confirm: "Cancel trip",
      });
      await expectToast(page, "Trip cancelled · 18 bookings cancelled");
      await expect(row.getByText("Cancelled", { exact: true })).toBeVisible();
      await expect(row.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
      await expect(row).toContainText("0 / 40");
    });
  });

  test("holidays: add one on a day with trips, then delete it", async ({ page }) => {
    await page.goto("/admin/holidays");
    await expect(page.getByRole("heading", { level: 1, name: "Holidays" })).toBeVisible();
    await expect(page.getByText("Every Sunday is a holiday — no trips run on Sundays.")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Gandhi Jayanti" })).toBeVisible();

    await page.getByRole("button", { name: "Add Holiday" }).click();
    const dialog = page.getByRole("dialog", { name: "Add holiday" });
    await expect(dialog).toBeVisible();
    // Sundays are holidays already.
    await dialog.getByLabel("Date", { exact: true }).fill(SUNDAY);
    await dialog.getByLabel("Reason").fill("Local strike");
    await dialog.getByRole("button", { name: "Add holiday", exact: true }).click();
    await expect(dialog.getByText("Sundays are already holidays")).toBeVisible();
    await dialog.getByLabel("Date", { exact: true }).fill(DAY_AFTER_TOMORROW);
    await dialog.getByLabel("Reason").fill("Local strike");
    await expect(dialog).toContainText(/\d+ trips and \d+ bookings on Wed, 30 Sep 2026 will be cancelled/);
    await dialog.getByRole("button", { name: "Add holiday", exact: true }).click();
    await confirmAction(page, {
      title: /^Cancel \d+ trips on 30 Sep\?$/,
      text: "Passengers will see their bookings as cancelled",
      confirm: "Add holiday and cancel trips",
    });
    await expectToast(page, /Holiday added · \d+ trips cancelled/);
    await expect(dialog).toBeHidden();

    const row = page.getByRole("listitem").filter({ hasText: "Wed, 30 Sep 2026" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Local strike");
    await expect(row).toContainText("In 2 days");

    await row.getByRole("button", { name: "Delete holiday on 30 Sep" }).click();
    await confirmAction(page, {
      title: "Delete holiday on 30 Sep?",
      text: "will not be restored",
      confirm: "Delete holiday",
    });
    await expectToast(page, "Holiday on 30 Sep deleted");
    await expect(row).toHaveCount(0);
    await expect(page.getByRole("listitem").filter({ hasText: "Gandhi Jayanti" })).toBeVisible();
  });

  test("users: disabling an account blocks its sign-in until it is enabled again", async ({ browser, page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
    await page.getByLabel("Search users").fill("Test");
    const row = listRow(page, TEST_CUSTOMER.name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(TEST_CUSTOMER.email);
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Disable ${TEST_CUSTOMER.name}` }).click();
    await confirmAction(page, {
      title: `Disable ${TEST_CUSTOMER.name}?`,
      text: "They have no upcoming bookings.",
      confirm: "Disable",
    });
    await expectToast(page, "User disabled");
    await expect(row.getByText("Disabled", { exact: true })).toBeVisible();

    const device = await openSecondDevice(browser, page);
    await device.page.goto("/login");
    await submitSignIn(device.page, TEST_CUSTOMER.email);
    await expectSignInRefused(device.page, "This account has been disabled");
    await device.context.close();

    await page.getByRole("button", { name: `Enable ${TEST_CUSTOMER.name}` }).click();
    await confirmAction(page, {
      title: `Enable ${TEST_CUSTOMER.name}?`,
      text: "Cancelled bookings are not restored.",
      confirm: "Enable",
    });
    await expectToast(page, "User enabled");
    await expect(row.getByText("Active", { exact: true })).toBeVisible();

    const again = await openSecondDevice(browser, page);
    await signIn(again.page, "customer", { email: TEST_CUSTOMER.email });
    await expect(again.page).toHaveURL("/customer");
    await expect(again.page.getByRole("heading", { level: 1, name: "Hi, Test" })).toBeVisible();
    await again.context.close();
  });

  test("bookings: search, filter by status, view and cancel", async ({ page }) => {
    await page.goto("/admin/bookings");
    await expect(page.getByRole("heading", { level: 1, name: "Bookings" })).toBeVisible();
    await page.getByLabel("Search", { exact: true }).fill("Surya");
    await expect(page).toHaveURL(/[?&]q=Surya/);
    const suryaRows = listRow(page, "Surya");
    await expect(suryaRows.first()).toBeVisible();
    await expect(listRow(page, "Arjun Nair")).toHaveCount(0);

    // Status filter: only cancelled bookings (or none) remain.
    await page.getByLabel("Status", { exact: true }).selectOption("cancelled");
    await expect(page).toHaveURL(/[?&]status=cancelled/);
    await expect(
      page.getByText("No bookings match your filters").or(suryaRows.first()),
    ).toBeVisible();
    await expect(listRow(page, "Confirmed")).toHaveCount(0);
    await page.getByLabel("Status", { exact: true }).selectOption("");
    await expect(page).not.toHaveURL(/status=/);

    // View → detail sheet.
    const first = suryaRows.first();
    await expect(first).toBeVisible();
    const firstId = (await first.textContent())?.match(BOOKING_ID)?.[0] ?? "";
    expect(firstId).toMatch(BOOKING_ID);
    await first.getByRole("button", { name: "View", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: firstId });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Surya");
    await expect(sheet).toContainText("99479 63408");
    await expect(sheet.getByRole("link", { name: "View trip" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Cancel a confirmed booking.
    const cancellable = suryaRows
      .filter({ has: page.getByRole("button", { name: "Cancel", exact: true }) })
      .first();
    await expect(cancellable).toBeVisible();
    const bookingId = (await cancellable.textContent())?.match(BOOKING_ID)?.[0] ?? "";
    expect(bookingId).toMatch(BOOKING_ID);
    await cancellable.getByRole("button", { name: "Cancel", exact: true }).click();
    await confirmAction(page, {
      title: `Cancel booking ${bookingId}?`,
      text: "Surya's seat",
      confirm: "Cancel booking",
    });
    await expectToast(page, "Booking cancelled");
    const cancelled = listRow(page, bookingId);
    await expect(cancelled.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(cancelled.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
  });

  test("reset demo data from the sidebar", async ({ page }) => {
    const sidebar = await openAdminSidebar(page);
    await sidebar.getByRole("button", { name: "Reset demo data" }).click();
    await confirmAction(page, {
      title: "Reset demo data?",
      text: "back to the seeded demo state",
      confirm: "Reset data",
    });
    await expectToast(page, "Demo data reset");
    // On phones the menu sheet stays open; close it to get back to the page.
    const sheet = page.getByRole("dialog", { name: "Admin menu" });
    if (await sheet.isVisible()) {
      await sheet.getByRole("button", { name: "Close" }).click();
      await expect(sheet).toBeHidden();
    }
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });
});

test("customer credentials are refused at the admin portal and pointed to the right one", async ({ page }) => {
  await page.goto("/staff/admin/login");
  await submitSignIn(page, ACCOUNTS.customer.email);
  await expectSignInRefused(page, "Customer accounts sign in at /login");
  await expect(page.getByRole("link", { name: "Go to Customer sign in" })).toHaveAttribute("href", "/login");
  await expect(page).toHaveURL(/\/staff\/admin\/login$/);
});
