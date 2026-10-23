import { test, expect } from "@playwright/test";
import analyzeFixture from "./fixtures/analyze.json";
import { completeSampleAnalysis, mockAI } from "./helpers";

const withGaps = {
  analyze: {
    body: { ...analyzeFixture, missingMustHave: ["Docker"], missingNiceToHave: ["AWS"] },
  },
};

test("shows an empty state before any analysis", async ({ page }) => {
  await mockAI(page);
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Analyze a resume or compare jobs first" })).toBeVisible();
});

test("offers no learning plan when nothing is missing", async ({ page }) => {
  await mockAI(page);
  await completeSampleAnalysis(page);
  await expect(page.getByRole("link", { name: "Make a learning plan" })).toHaveCount(0);
});

test("builds a plan from an analysis and tracks progress", async ({ page }) => {
  await mockAI(page, withGaps);
  await completeSampleAnalysis(page);
  await page.getByRole("link", { name: "Make a learning plan" }).click();
  await expect(page).toHaveURL(/\/learn\?from=/);

  const skills = page.getByRole("list", { name: "Skills to learn" }).getByRole("listitem");
  await expect(skills).toHaveCount(2);
  const docker = skills.filter({ hasText: "Docker" });
  await expect(docker).toContainText("Must-have");
  await expect(docker).toContainText("Write a Dockerfile that runs CampusConnect locally with one command.");
  const docsLink = docker.getByRole("link", { name: /Docker: get started/ });
  await expect(docsLink).toHaveAttribute("href", "https://docs.docker.com/get-started/");
  await expect(docsLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(skills.filter({ hasText: "AWS" })).toContainText("Nice to have");

  await page.getByRole("group", { name: "Progress for Docker" }).getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("0 of 2 skills done.")).toHaveCount(0);
  await expect(page.getByText("1 of 2 skills done.")).toBeVisible();
  await expect(docker).toContainText("you can honestly add Docker to your resume");

  await page.reload();
  await expect(page.getByRole("group", { name: "Progress for Docker" }).getByRole("button", { name: "Done" }))
    .toHaveAttribute("aria-pressed", "true");
});

test("builds a plan from a comparison's shared gaps", async ({ page }) => {
  await mockAI(page);
  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("link", { name: "Make a learning plan" }).click();

  const typescript = page.getByRole("listitem").filter({ hasText: "TypeScript" });
  await expect(typescript).toContainText("Required by 2 of 2 jobs");
  await expect(typescript.getByRole("link", { name: /TypeScript documentation/ })).toHaveAttribute(
    "href",
    "https://www.typescriptlang.org/docs/",
  );
});
