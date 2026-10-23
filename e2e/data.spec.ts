import fs from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

async function trackApplication(page: Page, role: string, followUpOn?: string) {
  await page.goto("/tracker");
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill(role);
  await page.getByLabel("Company", { exact: true }).fill("BrightPath Studio");
  if (followUpOn) await page.getByLabel("Follow up on (optional)").fill(followUpOn);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${role} · BrightPath Studio` })).toBeVisible();
}

function storedCount(page: Page, label: string) {
  return page.locator("li", { has: page.getByText(label, { exact: true }) });
}

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("backs up, deletes, and restores all data", async ({ page }) => {
  await completeSampleAnalysis(page);
  await trackApplication(page, "Frontend Developer");

  await page.goto("/data");
  await expect(storedCount(page, "Analyses and comparisons")).toContainText("1");
  await expect(storedCount(page, "Tracked applications")).toContainText("1");

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^resufit-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = (await download.path())!;
  const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
  expect(backup).toMatchObject({ app: "resufit", version: 1 });
  expect(backup.history).toHaveLength(1);
  expect(backup.applications[0].role).toBe("Frontend Developer");

  await page.getByRole("button", { name: "Delete all data" }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(page.getByText("All ResuFit data was deleted from this browser.")).toBeVisible();
  await expect(storedCount(page, "Tracked applications")).toContainText("0");
  await expect(page.getByRole("button", { name: "Download backup" })).toBeDisabled();

  await page.getByLabel("Backup file").setInputFiles(backupPath);
  await expect(page.getByText(/contains 1 analysis and 1 application/)).toBeVisible();
  await page.getByRole("button", { name: "Restore backup" }).click();
  await expect(page.getByText("Restored 1 analysis and 1 application.")).toBeVisible();
  await expect(storedCount(page, "Analyses and comparisons")).toContainText("1");

  await page.goto("/history");
  await expect(page.getByText("1 saved analysis")).toBeVisible();
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Frontend Developer · BrightPath Studio" })).toBeVisible();
});

test("merge keeps existing items and replace swaps them", async ({ page }) => {
  await trackApplication(page, "Frontend Developer");
  await page.goto("/data");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const backupPath = (await (await downloadEvent).path())!;

  await trackApplication(page, "Backend Developer Intern");
  await page.goto("/data");
  await page.getByLabel("Backup file").setInputFiles(backupPath);
  await page.getByRole("button", { name: "Restore backup" }).click();
  await expect(page.getByText(/Restored 0 analyses and 0 applications\. 1 item was skipped/)).toBeVisible();
  await expect(storedCount(page, "Tracked applications")).toContainText("2");

  await page.getByLabel("Backup file").setInputFiles(backupPath);
  await page.getByLabel(/Replace/).check();
  await expect(page.getByText("Your current analyses and applications will be deleted first.")).toBeVisible();
  await page.getByRole("button", { name: "Restore backup" }).click();
  await expect(storedCount(page, "Tracked applications")).toContainText("1");
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Frontend Developer · BrightPath Studio" })).toBeVisible();
  await expect(page.getByText("Backend Developer Intern")).toHaveCount(0);
});

test("rejects files that are not ResuFit backups", async ({ page }) => {
  await page.goto("/data");
  await page.getByLabel("Backup file").setInputFiles({
    name: "notes.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ hello: "world" })),
  });
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("This file isn't a ResuFit backup.");
  await expect(page.getByRole("button", { name: "Restore backup" })).toHaveCount(0);
});

test("adds a follow-up to the calendar from the tracker", async ({ page }) => {
  await trackApplication(page, "Frontend Developer", "2026-12-01");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    "resufit-follow-up-frontend-developer-brightpath-studio.ics",
  );
  const ics = await fs.readFile((await download.path())!, "utf8");
  expect(ics).toContain("BEGIN:VCALENDAR");
  expect(ics).toContain("DTSTART;VALUE=DATE:20261201");
  expect(ics).toContain("SUMMARY:Follow up: Frontend Developer at BrightPath Studio");
});
