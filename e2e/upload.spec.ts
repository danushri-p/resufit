import path from "node:path";
import { test, expect } from "@playwright/test";
import { mockAI } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("uploads and parses the sample PDF and DOCX", async ({ page }) => {
  await page.goto("/analyze");
  const upload = page.getByLabel("Select resume file");

  await upload.setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "sample-resume.pdf"));
  await expect(page.getByText(/sample-resume\.pdf · \d+ words/)).toBeVisible();
  await expect(page.getByText("Alex Kumar", { exact: false })).toBeVisible();

  await upload.setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "sample-resume.docx"));
  await expect(page.getByText(/sample-resume\.docx · \d+ words/)).toBeVisible();
  await expect(page.getByText("Alex Kumar", { exact: false })).toBeVisible();
});

test("rejects unsupported uploads and shows the empty preview state", async ({ page }) => {
  await page.goto("/analyze");
  await expect(page.getByText("No resume text to preview yet.")).toBeVisible();

  await page.getByLabel("Select resume file").setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a supported resume"),
  });
  await expect(page.locator("p[role='alert']")).toContainText("Unsupported file type");
});
