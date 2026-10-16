import { test, expect } from "@playwright/test";

test("landing page shows title, navigation, and privacy note", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("ResuFit – AI resume analyzer");
  await expect(page.locator("link[rel='icon']")).toHaveAttribute("href", /icon\.svg/);
  await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute(
    "href",
    /apple-icon/,
  );
  const landingLogo = page.locator("header").getByRole("link", { name: "ResuFit" });
  await expect(landingLogo).toHaveAttribute("href", "/");
  await expect(landingLogo.locator("[aria-label='ResuFit']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your privacy" })).toBeVisible();
  await expect(page.getByText(/Saved history stays in this browser/)).toBeVisible();
  await page.getByRole("link", { name: "Analyze your resume" }).click();
  await expect(page).toHaveURL("/analyze");
  await expect(page.locator("header").getByRole("link", { name: "ResuFit" })).toHaveAttribute(
    "href",
    "/",
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Try a sample" }).click();
  await expect(page).toHaveURL("/analyze?sample=1");
});

test("history and not-found headers link the brand logo home", async ({ page }) => {
  await page.goto("/history");
  await expect(page.locator("header").getByRole("link", { name: "ResuFit" })).toHaveAttribute(
    "href",
    "/",
  );

  await page.goto("/does-not-exist");
  await expect(page.locator("header").getByRole("link", { name: "ResuFit" })).toHaveAttribute(
    "href",
    "/",
  );
});
