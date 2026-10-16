import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("history opens saved results and the saved cover letter", async ({ page }) => {
  await completeSampleAnalysis(page);
  await page.getByRole("button", { name: "Write cover letter" }).click();
  await expect(page.getByLabel("Editable cover letter")).toBeVisible();

  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await expect(page.getByText("No saved analyses yet")).toHaveCount(0);
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Full-Stack Developer Intern" })).toBeVisible();
  await expect(page.getByText("ATS score: 88/100")).toBeVisible();
  await expect(page.getByText(/Dear Hiring Team/)).toBeVisible();
});

test("deletes an entry and confirms clearing all history", async ({ page }) => {
  await completeSampleAnalysis(page);
  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("No saved analyses yet")).toBeVisible();

  await page.getByRole("link", { name: "Analyze a resume" }).first().click();
  await completeSampleAnalysis(page);
  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByText("Clear all saved analyses?")).toBeVisible();
  await page.getByRole("button", { name: "Confirm clear" }).click();
  await expect(page.getByText("No saved analyses yet")).toBeVisible();
});
