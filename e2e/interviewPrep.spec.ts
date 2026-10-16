import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

test("generates, practises, downloads, and saves interview prep", async ({ page }) => {
  await mockAI(page);
  await completeSampleAnalysis(page);

  await page.getByRole("button", { name: "Prepare for interview" }).click();
  await expect(page.getByText("Interview prep", { exact: true })).toBeVisible();
  await expect(page.getByText("Question 2 was adjusted to stay grounded in your resume."))
    .toBeVisible();

  const question = page.getByText("How did you build the event discovery experience?");
  await question.click();
  await expect(
    page.getByText("Describe the reusable React and TypeScript components in CampusConnect."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Practice mode off" }).click();
  await expect(
    page.getByText("Describe the reusable React and TypeScript components in CampusConnect."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Show outline" }).first().click();
  await expect(
    page.getByText("Describe the reusable React and TypeScript components in CampusConnect."),
  ).toBeVisible();

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("resufit-interview-prep.md");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  await expect.poll(async () => fs.readFile(downloadPath!, "utf8"))
    .toContain("## Technical");

  await page.goto("/history");
  await page.getByRole("button", { name: "Open" }).first().click();
  await expect(page.getByText("Interview prep", { exact: true })).toBeVisible();
  await expect(
    page.getByText("How did you build the event discovery experience?"),
  ).toBeVisible();
});
