import { test, expect } from "@playwright/test";

test("landing page shows title, navigation, and privacy note", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("ResuFit – AI resume analyzer");
  await expect(page.locator("link[rel='icon']")).toHaveAttribute("href", /icon\.svg/);
  await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute(
    "href",
    /apple-icon/,
  );
  const homeLink = page.getByRole("link", { name: "ResuFit home" });
  await expect(homeLink).toHaveAttribute("href", "/");
  await expect(homeLink.locator("[aria-label='ResuFit']")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your next opportunity starts with a better resume/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your privacy" })).toBeVisible();
  await expect(page.getByText(/Saved history and tracked applications stay in this browser/)).toBeVisible();
  await page.getByRole("link", { name: "Analyze your resume" }).click();
  await expect(page).toHaveURL("/analyze");
  await page.goto("/");
  await page.getByRole("link", { name: "Try a sample" }).click();
  await expect(page).toHaveURL("/analyze?sample=1");
});

test("the sidebar marks the current page and links the logo home", async ({ page }) => {
  await page.goto("/history");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "ResuFit home" })).toHaveAttribute("href", "/");

  await nav.getByRole("link", { name: "Compare jobs" }).click();
  await expect(page).toHaveURL("/compare");
  await expect(nav.getByRole("link", { name: "Compare jobs" })).toHaveAttribute("aria-current", "page");

  await page.goto("/does-not-exist");
  await expect(page.getByRole("link", { name: "ResuFit home" })).toHaveAttribute("href", "/");
});

test("cover letter and interview prep links explain they need an analysis first", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cover letter" }).click();
  await expect(page).toHaveURL("/analyze?view=cover-letter");
  await expect(page.getByText(/Analyze a resume first, then you can write a cover letter/)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Cover letter" }),
  ).toHaveAttribute("aria-current", "page");
});

test("phones get a menu button instead of the sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav).toHaveCount(0);

  const menu = page.getByRole("button", { name: "Open menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  await nav.getByRole("link", { name: "Tracker" }).click();
  await expect(page).toHaveURL("/tracker");
  await expect(nav).toHaveCount(0);
});
