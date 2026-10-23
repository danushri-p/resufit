import { test, expect, type Page } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("follows the system color scheme by default", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await isDark(page)).toBe(true);
  await expect(page.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => isDark(page)).toBe(false);
});

test("remembers an explicit choice across pages and reloads", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("group", { name: "Color theme" }).getByRole("button", { name: "Dark" }).click();
  expect(await isDark(page)).toBe(true);

  await page.goto("/tracker");
  expect(await isDark(page)).toBe(true);
  await page.reload();
  expect(await isDark(page)).toBe(true);
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Light" }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await isDark(page)).toBe(false);
});

test("applies dark mode before the app's JavaScript runs (no white flash)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("resufit:theme", "dark"));
  // Block the app bundles: only the inline theme script can set the class now.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());
  await page.goto("/");
  expect(await isDark(page)).toBe(true);
});

test("printed resumes stay light in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await completeSampleAnalysis(page);
  await page.getByRole("button", { name: "Build tailored resume" }).click();
  const preview = page.getByRole("article", { name: "Resume preview" });
  await expect(preview).toBeVisible();

  const screenBackground = await preview.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  const printBackground = await preview.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(printBackground).toBe("rgb(255, 255, 255)");
  expect(screenBackground).not.toBe("rgb(255, 255, 255)");
});
