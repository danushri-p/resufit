import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { mockAI } from "./helpers";

test("compares sample jobs, opens a full analysis, and downloads the report", async ({ page }) => {
  await mockAI(page);
  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();

  await expect(page.getByLabel("Job description 1")).toHaveValue(/Frontend Developer/);
  await expect(page.getByLabel("Job description 2")).toHaveValue(/Backend Developer Intern/);
  await page.getByRole("button", { name: "Compare", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Comparison results" })).toBeVisible();
  const ranked = page.getByRole("region", { name: "Ranked job matches" });
  await expect(ranked.getByText("Backend Developer Intern", { exact: true }).first())
    .toBeVisible();
  await expect(ranked.getByText("Best fit")).toBeVisible();
  await expect(ranked.getByText("Frontend Developer", { exact: true })).toBeVisible();
  await expect(page.getByText("TypeScript", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("missing in 2 of 2 jobs")).toBeVisible();

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download comparison" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("resufit-job-comparison.md");
  const file = await download.path();
  expect(file).not.toBeNull();
  await expect.poll(async () => fs.readFile(file!, "utf8"))
    .toContain("Backend Developer Intern");

  await ranked.getByRole("button", { name: "Open full analysis" }).first().click();
  await expect(page).toHaveURL(/\/analyze$/);
  await expect(
    page.getByRole("textbox", { name: "Job description", exact: true }),
  ).toHaveValue(/Backend Developer Intern/);
  await expect(page.getByText("No resume text to preview yet.")).toHaveCount(0);
  await expect(page.getByText("Alex Kumar", { exact: false })).toBeVisible();
});

test("adds and removes job fields while keeping at least two", async ({ page }) => {
  await mockAI(page);
  await page.goto("/compare");

  await expect(page.getByLabel("Job description 1")).toBeVisible();
  await expect(page.getByLabel("Job description 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove job 1" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add another job" }).click();
  await expect(page.getByLabel("Job description 3")).toBeVisible();
  await page.getByRole("button", { name: "Remove job 3" }).click();
  await expect(page.getByLabel("Job description 3")).toHaveCount(0);
});

test("saves and opens the read-only comparison in history", async ({ page }) => {
  await mockAI(page);
  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comparison results" })).toBeVisible();

  await page.goto("/history");
  await expect(page.getByText("Comparison", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByRole("heading", { name: "Comparison (2 jobs)" })).toBeVisible();
  await expect(page.getByText("Best fit")).toBeVisible();
  await expect(page.getByText("Skills to learn next", { exact: true })).toBeVisible();
});
