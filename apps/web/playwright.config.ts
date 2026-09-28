import { defineConfig, devices } from "@playwright/test";

/**
 * Excel Cabs end-to-end suite.
 *
 * - Runs against a production build: `pnpm exec next build` first (turbo's `test:e2e` depends on
 *   `build`), then `next start` on E2E_PORT (3100) is started by `webServer` below.
 * - Mobile projects use the Pixel 7 descriptor (Chromium) with overridden viewports, so only the
 *   Chromium headless shell is needed (`pnpm --filter web e2e:install`).
 * - The smoke spec runs on every project; flow specs run on m390 + d1440 and the responsive spec
 *   on the mobile projects, which keeps the run reasonable on a small box.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

const SMOKE = /smoke\.spec\.ts$/;
const RESPONSIVE = /responsive\.spec\.ts$/;
const SMOKE_AND_RESPONSIVE = /(smoke|responsive)\.spec\.ts$/;

const mobile = (width: number, height: number) => ({
  ...devices["Pixel 7"],
  viewport: { width, height },
  screen: { width, height },
});
const desktop = (width: number, height: number) => ({
  ...devices["Desktop Chrome"],
  viewport: { width, height },
});

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Two workers keep the run within a 2-CPU box's headroom (each worker holds a Chromium shell);
  // override per run with `playwright test --workers N`.
  workers: 2,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // The app models everything in IST; pinning the browser timezone keeps native date/time
    // inputs and the fixed clock (see e2e/fixtures.ts) consistent on any machine.
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  },
  projects: [
    { name: "m375", use: mobile(375, 667), testMatch: SMOKE_AND_RESPONSIVE },
    { name: "m390", use: mobile(390, 844) },
    { name: "m430", use: mobile(430, 932), testMatch: SMOKE_AND_RESPONSIVE },
    { name: "d1280", use: desktop(1280, 800), testMatch: SMOKE },
    { name: "d1440", use: desktop(1440, 900), testIgnore: RESPONSIVE },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
