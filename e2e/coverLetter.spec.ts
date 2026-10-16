import fs from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, mockAI } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("writes an editable cover letter and supports copy and download", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await completeSampleAnalysis(page);
  await page.getByRole("button", { name: "Write cover letter" }).click();

  const editor = page.getByLabel("Editable cover letter");
  await expect(editor).toContainText("Dear Hiring Team");
  await expect(page.getByText(/words$/)).toBeVisible();
  await expect(page.getByText("Review and personalise before sending")).toBeVisible();

  await editor.fill("Edited letter text for verification.");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Edited letter text for verification.",
  );

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("resufit-cover-letter.txt");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  await expect.poll(async () => fs.readFile(downloadPath!, "utf8")).toBe(
    "Edited letter text for verification.",
  );
});

test("shows neutral accuracy warnings from the cover-letter response", async ({ page }) => {
  await mockAI(page, {
    "cover-letter": {
      body: {
        letter: "Dear Hiring Team,\n\nA tailored letter.\n\nSincerely,\nAlex Kumar",
        warnings: ["Paragraph 2 was removed because it contained unsupported numbers."],
      },
    },
  });
  await completeSampleAnalysis(page);
  await page.getByRole("button", { name: "Write cover letter" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Accuracy notes" })).toContainText(
    "Paragraph 2 was removed",
  );
});
