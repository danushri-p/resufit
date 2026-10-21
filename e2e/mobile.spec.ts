import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, horizontalOverflow, mockAI } from "./helpers";

test("landing, results, history, and tracker fit a 375px viewport without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockAI(page);

  await page.goto("/");
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto("/compare");
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comparison results" })).toBeVisible();
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await completeSampleAnalysis(page);
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto("/history");
  await expect(page.getByText("2 saved analyses")).toBeVisible();
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Track your first application" })).toBeVisible();
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill("Full Stack Developer Intern with a long title");
  await page.getByLabel("Company", { exact: true }).fill("Brightloop Technologies Private Limited");
  await page.getByLabel("Follow up on (optional)").fill("2020-01-01");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Follow up due")).toBeVisible();
  await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(0);
});
