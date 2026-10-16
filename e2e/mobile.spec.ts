import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, horizontalOverflow, mockAI } from "./helpers";

test("landing, results, and history fit a 375px viewport without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockAI(page);

  await page.goto("/");
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await completeSampleAnalysis(page);
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
