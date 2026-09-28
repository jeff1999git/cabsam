import { expect, type Locator, type Page } from "@playwright/test";

/** A toast (sonner renders them in a "Notifications" live region). */
export function toast(page: Page, text: string | RegExp): Locator {
  return page.getByRole("region", { name: /notifications/i }).getByText(text).first();
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(toast(page, text)).toBeVisible();
}

/** The app's ConfirmDialog (a Radix alert dialog). */
export function confirmDialog(page: Page): Locator {
  return page.getByRole("alertdialog");
}

interface ConfirmOptions {
  /** Expected dialog title. */
  title: string | RegExp;
  /** Exact label of the confirming button ("Disable", "Cancel booking", …). */
  confirm: string;
  /** Text the dialog body must contain. */
  text?: string | RegExp;
}

/** Waits for the confirmation dialog, checks its title (and body), confirms, and waits for it to close. */
export async function confirmAction(page: Page, options: ConfirmOptions): Promise<void> {
  const dialog = confirmDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText(options.title);
  if (options.text !== undefined) await expect(dialog).toContainText(options.text);
  await dialog.getByRole("button", { name: options.confirm, exact: true }).click();
  await expect(dialog).toBeHidden();
}

/**
 * A row of a ResponsiveTable: a table row from `md` up, a card list item below (both are in the DOM;
 * role queries only see the visible one). Scoped to the page's main content so toasts (also list
 * items) never match.
 */
export function listRow(page: Page, text: string | RegExp): Locator {
  const main = page.getByRole("main");
  return main
    .getByRole("row")
    .filter({ hasText: text })
    .or(main.getByRole("listitem").filter({ hasText: text }));
}

/** Waits until nothing on the page reports `aria-busy="true"` (queries settled, skeletons gone). */
export async function waitForSettled(page: Page): Promise<void> {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/** Asserts the document does not scroll horizontally at the current viewport. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await waitForSettled(page);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.scrollingElement ?? document.documentElement;
          return root.scrollWidth - window.innerWidth;
        }),
      { message: "document.scrollingElement.scrollWidth must not exceed window.innerWidth" },
    )
    .toBeLessThanOrEqual(0);
}

/** The admin sidebar: the fixed column from `lg`, the menu sheet below (opened here when needed). */
export async function openAdminSidebar(page: Page): Promise<Locator> {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if (await menuButton.isVisible()) {
    await menuButton.click();
    const sheet = page.getByRole("dialog", { name: "Admin menu" });
    await expect(sheet).toBeVisible();
    return sheet;
  }
  return page.getByRole("complementary");
}

/** `<select>`: picks the option whose label contains `text` (labels carry ids and symbols). */
export async function selectOptionContaining(select: Locator, text: string): Promise<void> {
  const option = select.locator("option", { hasText: text }).first();
  await expect(option).toBeAttached();
  const value = await option.getAttribute("value");
  if (value === null) throw new Error(`Option containing "${text}" has no value`);
  await select.selectOption(value);
}
