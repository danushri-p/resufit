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

test("analysis results have no serious or critical accessibility violations", async ({ page }) => {
  await completeSampleAnalysis(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("history page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/history");
  await expectNoSeriousAccessibilityViolations(page);
});

test("not-found page has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/does-not-exist");
  await expectNoSeriousAccessibilityViolations(page);
});
