import fs from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

const ORIGINAL =
  "Developed 12 REST endpoints with Node.js and Express to manage events and participant records.";
const IMPROVED =
  "Built 12 Node.js and Express REST endpoints to manage campus events and participant records.";

async function openBuilder(page: Page, improve = true) {
  await completeSampleAnalysis(page);
  if (improve) {
    await page.getByRole("button", { name: "Improve bullets" }).click();
    await expect(page.getByText(IMPROVED).first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Build tailored resume" }).click();
  await expect(page).toHaveURL("/resume");
  await expect(page.getByRole("heading", { name: "Tailored resume" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("shows a helpful empty state without an analysis", async ({ page }) => {
  await page.goto("/resume");
  await expect(page.getByRole("heading", { name: "Analyze a resume first" })).toBeVisible();
});

test("builds a tailored resume with improved bullets, ordering, and edits", async ({ page }) => {
  await openBuilder(page);
  const preview = page.getByRole("article", { name: "Resume preview" });
  const bullet = preview.getByLabel("CampusConnect bullet 2", { exact: true });

  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Alex Kumar");
  await expect(bullet).toHaveValue(IMPROVED);
  await expect(page.getByText("Using 2 of 2 improved bullets.")).toBeVisible();

  await preview.getByRole("group", { name: "Wording for CampusConnect bullet 2" })
    .getByRole("button", { name: "Original" })
    .click();
  await expect(bullet).toHaveValue(ORIGINAL);
  await expect(page.getByText("Using 1 of 2 improved bullets.")).toBeVisible();

  await bullet.fill("Developed 12 REST endpoints for 3 student clubs.");
  await expect(preview.getByText("Edited")).toBeVisible();

  await page.getByRole("button", { name: "Move StudySpace up" }).click();
  await expect(preview.getByLabel("Project name 1")).toHaveValue("StudySpace");

  // Edits survive a reload in this tab.
  await page.reload();
  await expect(page.getByLabel("CampusConnect bullet 2", { exact: true })).toHaveValue(
    "Developed 12 REST endpoints for 3 student clubs.",
  );

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^alex-kumar-.*-resufit\.txt$/);
  const text = await fs.readFile((await download.path())!, "utf8");
  expect(text.startsWith("Alex Kumar\n")).toBe(true);
  expect(text).toContain("- Developed 12 REST endpoints for 3 student clubs.");
  expect(text.indexOf("StudySpace")).toBeLessThan(text.indexOf("CampusConnect"));
  expect(text).toMatch(/SKILLS\n/);
});

test("prints only the resume", async ({ page }) => {
  await openBuilder(page, false);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("article", { name: "Resume preview" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save as PDF" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Tailored resume" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Move .* up/ }).first()).toBeHidden();
});
