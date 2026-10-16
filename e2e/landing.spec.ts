import { test, expect } from "@playwright/test";

test("landing page shows title, navigation, and privacy note", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("ResuFit – AI resume analyzer");
  await expect(page.getByRole("heading", { name: "Your privacy" })).toBeVisible();
  await expect(page.getByText(/Saved history stays in this browser/)).toBeVisible();
  await page.getByRole("link", { name: "Analyze your resume" }).click();
  await expect(page).toHaveURL("/analyze");
  await page.goto("/");
  await page.getByRole("link", { name: "Try a sample" }).click();
  await expect(page).toHaveURL("/analyze?sample=1");
});
