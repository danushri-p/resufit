import fs from "node:fs/promises";
import path from "node:path";
import { test, type Page } from "@playwright/test";
import analyzeFixture from "./fixtures/analyze.json";
import { mockAI } from "./helpers";

test.skip(
  process.env.npm_lifecycle_event !== "screenshots",
  "Run this spec explicitly with npm run screenshots.",
);

const directory = path.join(process.cwd(), "docs", "screenshots");

async function capture(page: Page, name: string, fullPage = false) {
  // Let fonts and layout settle so screenshots are stable.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage, animations: "disabled" });
}

function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

async function addApplication(
  page: Page,
  values: { role: string; company: string; status: string; followUpOn?: string; notes?: string },
) {
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill(values.role);
  await page.getByLabel("Company", { exact: true }).fill(values.company);
  await page.getByLabel("Status", { exact: true }).selectOption(values.status);
  if (values.followUpOn) await page.getByLabel("Follow up on (optional)").fill(values.followUpOn);
  if (values.notes) await page.getByLabel("Notes (optional)").fill(values.notes);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("heading", { name: `${values.role} · ${values.company}` }).waitFor();
}

test("captures the README screenshots", async ({ page }) => {
  test.setTimeout(120_000);
  // Fictional sample data plus two skill gaps so the learning plan has content.
  await mockAI(page, {
    analyze: {
      body: { ...analyzeFixture, missingMustHave: ["Docker"], missingNiceToHave: ["AWS"] },
    },
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await fs.mkdir(directory, { recursive: true });

  await page.goto("/");
  await page.getByRole("heading", { level: 1, name: "ResuFit" }).waitFor();
  await capture(page, "landing");

  await page.goto("/login");
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await capture(page, "login");

  await page.goto("/home");
  await page.getByRole("heading", { name: /Your next opportunity/ }).waitFor();
  await capture(page, "home");

  await page.goto("/analyze?sample=1");
  await page.getByText("Sample data: fictional resume and job description.").waitFor();
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await page.getByRole("heading", { name: "Results" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, "results");

  await page.getByRole("tab", { name: "ATS check" }).click();
  await page.getByText(/^ATS score: /).waitFor();
  await capture(page, "ats");

  await page.getByRole("tab", { name: "Overview" }).click();
  await page.getByRole("button", { name: "Improve bullets" }).click();
  await page.getByText("Improved bullets", { exact: true }).waitFor();
  await capture(page, "bullets");

  await page.getByRole("tab", { name: "Cover letter" }).click();
  await page.getByRole("button", { name: "Write cover letter" }).click();
  await page.getByLabel("Editable cover letter").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capture(page, "cover-letter");

  await page.getByRole("tab", { name: "Bullets" }).click();

  await page.getByRole("button", { name: "Build tailored resume" }).click();
  await page.getByRole("article", { name: "Resume preview" }).waitFor();
  await capture(page, "resume");

  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  const comparison = page.getByRole("heading", { name: "Comparison results" });
  await comparison.waitFor();
  await comparison.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await capture(page, "compare");

  await page.goto("/learn");
  await page.getByRole("list", { name: "Skills to learn" }).waitFor();
  // The plan defaults to the newest saved item (the comparison above).
  await page
    .getByRole("group", { name: /^Progress for / })
    .first()
    .getByRole("button", { name: "Learning" })
    .click();
  await capture(page, "learn");

  await page.goto("/tracker");
  await addApplication(page, {
    role: "Full-Stack Developer Intern",
    company: "Northstar Learning Lab",
    status: "interviewing",
    followUpOn: isoDate(0),
    notes: "Technical interview on Friday. Review CampusConnect's API design.",
  });
  await addApplication(page, {
    role: "Frontend Developer",
    company: "BrightPath Studio",
    status: "applied",
    followUpOn: isoDate(7),
  });
  await addApplication(page, { role: "Backend Developer Intern", company: "Harborlight Systems", status: "saved" });
  await capture(page, "tracker");

  await page.goto("/history");
  await page.getByRole("searchbox", { name: "Search history" }).waitFor();
  await capture(page, "history");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.getByRole("heading", { level: 1, name: "ResuFit" }).waitFor();
  await capture(page, "dark");
});
