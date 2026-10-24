import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, mockAI, openTab } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("history opens saved results and the saved cover letter", async ({ page }) => {
  await completeSampleAnalysis(page);
  await openTab(page, "Cover letter");
  await page.getByRole("button", { name: "Write cover letter" }).click();
  await expect(page.getByLabel("Editable cover letter")).toBeVisible();

  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await expect(page.getByText("No saved analyses yet")).toHaveCount(0);
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Full-Stack Developer Intern" })).toBeVisible();
  await openTab(page, "ATS check");
  await expect(page.getByText("ATS score: 88/100")).toBeVisible();
  await openTab(page, "Cover letter");
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

test("searches saved analyses by role, company or file", async ({ page }) => {
  await completeSampleAnalysis(page);
  await page.goto("/history");
  const search = page.getByRole("searchbox", { name: "Search history" });
  await search.fill("northstar");
  await expect(page.getByRole("button", { name: "Open" })).toHaveCount(1);
  await search.fill("no such company");
  await expect(page.getByRole("button", { name: "Open" })).toHaveCount(0);
  await expect(page.getByText("No saved items match “no such company”.")).toBeVisible();
});
