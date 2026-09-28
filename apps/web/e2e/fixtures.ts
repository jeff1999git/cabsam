import { test as base, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * "Now" in every browser: Mon 28 Sep 2026, 06:30 IST — before the day's first (7:00 AM) trips, so
 * "today", departure and start/cancel rules are deterministic whatever the machine clock says.
 */
export const FIXED_NOW = new Date("2026-09-28T06:30:00+05:30");
export const TODAY = "2026-09-28";
export const TOMORROW = "2026-09-29";
/** The first operating day after tomorrow (Wed 30 Sep). */
export const DAY_AFTER_TOMORROW = "2026-09-30";
/** Seeded holiday (Gandhi Jayanti). */
export const HOLIDAY = "2026-10-02";

/** The mock database persists under this localStorage prefix (one key per schema version). */
const DB_KEY_PREFIX = "excelcabs:db:";

/** Pins `Date.now()` for a page; timers keep running. Call before the first navigation. */
export async function pinClock(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
}

/**
 * Every test gets a fresh browser context (an empty localStorage reseeds the demo database) whose
 * clock is pinned to `FIXED_NOW` before the first navigation.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await pinClock(page);
    await use(page);
  },
});

export { expect };

export interface SecondDevice {
  context: BrowserContext;
  page: Page;
}

/**
 * A second, signed-out browser ("another device") that sees the same demo data as `page`. The mock
 * database lives in localStorage, so it is copied into the new context once per tab (a real
 * backend would simply be shared); the session key is not copied. Close the context when done.
 */
export async function openSecondDevice(browser: Browser, page: Page): Promise<SecondDevice> {
  // A page that has not navigated yet has no storage to share (the new context seeds its own copy).
  const stored = page.url().startsWith("http")
    ? await page.evaluate(
        (prefix) => Object.entries(window.localStorage).filter(([key]) => key.startsWith(prefix)),
        DB_KEY_PREFIX,
      )
    : [];
  const context = await browser.newContext();
  await context.addInitScript((entries: [string, string][]) => {
    const marker = "e2e:db-copied";
    if (window.sessionStorage.getItem(marker)) return;
    for (const [key, value] of entries) window.localStorage.setItem(key, value);
    window.sessionStorage.setItem(marker, "1");
  }, stored);
  const second = await context.newPage();
  await pinClock(second);
  return { context, page: second };
}
