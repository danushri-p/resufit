import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

async function expectNoSeriousAccessibilityViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("landing page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousAccessibilityViolations(page);
});

test("empty analyze page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/analyze");
  await expectNoSeriousAccessibilityViolations(page);
});

test("empty compare page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/compare");
  await expectNoSeriousAccessibilityViolations(page);
});

test("comparison results have no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comparison results" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("analysis results have no serious or critical accessibility violations", async ({ page }) => {
  await completeSampleAnalysis(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("interview preparation has no serious or critical accessibility violations", async ({ page }) => {
  await completeSampleAnalysis(page);
  await page.getByRole("button", { name: "Prepare for interview" }).click();
  await expect(page.getByRole("button", { name: "Practice mode off" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("history page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/history");
  await expectNoSeriousAccessibilityViolations(page);
});

test("empty tracker has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Track your first application" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("tracker with entries and the form open has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/tracker");
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill("Frontend Developer");
  await page.getByLabel("Company", { exact: true }).fill("BrightPath Studio");
  await page.getByLabel("Status", { exact: true }).selectOption("applied");
  await page.getByLabel("Follow up on (optional)").fill("2020-01-01");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Follow up due")).toBeVisible();
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter the role.")).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("data page with a restore preview has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "Your data" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByLabel("Backup file").setInputFiles({
    name: "resufit-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "resufit",
        version: 1,
        exportedAt: "2026-10-01T00:00:00.000Z",
        history: [],
        applications: [
          {
            id: "a1",
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
            role: "Frontend Developer",
            company: "BrightPath Studio",
            status: "saved",
            appliedOn: null,
            followUpOn: null,
            jobUrl: null,
            notes: "",
            matchScore: null,
            historyId: null,
          },
        ],
      }),
    ),
  });
  await expect(page.getByRole("button", { name: "Restore backup" })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
});

test("not-found page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expectNoSeriousAccessibilityViolations(page);
});
