import { expect, type Page } from "@playwright/test";
import analyzeFixture from "./fixtures/analyze.json";
import coverLetterFixture from "./fixtures/cover-letter.json";
import compareFixture from "./fixtures/compare.json";
import extractFixture from "./fixtures/extract.json";
import interviewPrepFixture from "./fixtures/interview-prep.json";
import rewriteFixture from "./fixtures/rewrite.json";

export type AIEndpoint =
  | "extract"
  | "analyze"
  | "rewrite"
  | "cover-letter"
  | "interview-prep"
  | "compare";

export interface MockResponse {
  status?: number;
  body?: unknown;
  delayMs?: number;
}

type MockOverride = MockResponse | MockResponse[];

const fixtureBodies: Record<AIEndpoint, unknown> = {
  extract: extractFixture,
  analyze: analyzeFixture,
  rewrite: rewriteFixture,
  "cover-letter": coverLetterFixture,
  "interview-prep": interviewPrepFixture,
  compare: compareFixture,
};

export async function mockAI(
  page: Page,
  overrides: Partial<Record<AIEndpoint, MockOverride>> = {},
) {
  for (const endpoint of Object.keys(fixtureBodies) as AIEndpoint[]) {
    const override = overrides[endpoint];
    const responses = Array.isArray(override) ? override : undefined;
    let responseIndex = 0;

    await page.route(`**/api/${endpoint}`, async (route) => {
      const selected = responses
        ? responses[responseIndex++]
        : override;
      const response =
        selected && !Array.isArray(selected)
          ? selected
          : {};
      const body = response.body ?? fixtureBodies[endpoint];

      if (response.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, response.delayMs));
      }

      await route.fulfill({
        status: response.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
  }
}

export async function loadSample(page: Page) {
  await page.goto("/analyze");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(page.getByLabel("Job description")).toHaveValue(/Full-Stack Developer Intern/);
  await expect(page.getByText("Alex Kumar", { exact: false })).toBeVisible();
}

export async function completeSampleAnalysis(page: Page) {
  await loadSample(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Resume match score" })).toHaveAttribute(
    "aria-valuenow",
    "82",
  );
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
