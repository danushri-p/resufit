import fs from "node:fs/promises";
import path from "node:path";
import { test } from "@playwright/test";
import { mockAI } from "./helpers";

test.skip(
  process.env.npm_lifecycle_event !== "screenshots",
  "Run this spec explicitly with npm run screenshots.",
);

test("captures the README screenshots", async ({ page }) => {
  await mockAI(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const screenshotDirectory = path.join(process.cwd(), "docs", "screenshots");
  await fs.mkdir(screenshotDirectory, { recursive: true });

  await page.goto("/analyze?sample=1");
  await page.getByText("Sample data: fictional resume and job description.").waitFor();
  await page.screenshot({
    path: path.join(screenshotDirectory, "analyze.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByRole("heading", { name: "Results" }).waitFor();
  await page.screenshot({
    path: path.join(screenshotDirectory, "results.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Write cover letter" }).click();
  await page.getByLabel("Editable cover letter").waitFor();
  await page.screenshot({
    path: path.join(screenshotDirectory, "cover-letter.png"),
    fullPage: true,
  });

  await page.goto("/history");
  await page.getByText("1 saved analysis").waitFor();
  await page.screenshot({
    path: path.join(screenshotDirectory, "history.png"),
    fullPage: true,
  });
});
