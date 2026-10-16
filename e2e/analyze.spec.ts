import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { loadSample, mockAI } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("analyzes the sample, rewrites bullets, downloads a report, and starts over", async ({ page }) => {
  await loadSample(page);

  const analyzeButton = page.getByRole("button", { name: "Analyze", exact: true });
  await analyzeButton.click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Results" })).toBeFocused();
  await expect(page.getByRole("progressbar", { name: "Resume match score" })).toHaveAttribute(
    "aria-valuenow",
    "82",
  );
  await expect(page.getByText("React", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Highlight API development")).toBeVisible();
  await expect(page.getByText("ATS score: 88/100")).toBeVisible();

  await page.getByRole("button", { name: "Improve bullets" }).click();
  await expect(page.getByText("Improved bullets", { exact: true })).toBeVisible();
  await expect(page.getByText(/Built 12 Node\.js and Express REST endpoints/)).toBeVisible();

  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report" }).click();
  const report = await reportDownload;
  expect(report.suggestedFilename()).toMatch(/\.md$/);
  const reportPath = await report.path();
  expect(reportPath).not.toBeNull();
  await expect.poll(async () => fs.readFile(reportPath!, "utf8")).toContain("82/100");

  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByText("No resume text to preview yet.")).toBeVisible();
  await expect(page.getByLabel("Job description")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Results" })).toHaveCount(0);
});

test("keeps action buttons disabled until the mocked requests finish", async ({ page }) => {
  await mockAI(page, {
    extract: { delayMs: 400 },
    analyze: { delayMs: 400 },
  });
  await loadSample(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page.getByRole("button", { name: "Analyzing…" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
});
