import { test, expect } from "@playwright/test";
import { completeSampleAnalysis, loadSample, mockAI, openTab } from "./helpers";
import analyzeFixture from "./fixtures/analyze.json";

test("shows retry countdown after a temporary extraction limit", async ({ page }) => {
  await mockAI(page, {
    extract: [
      {
        status: 429,
        body: {
          error: "The free Gemini limit was reached. Try again in 5 seconds.",
          retryAfterSeconds: 5,
        },
      },
    ],
  });
  await loadSample(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();

  await expect(page.locator("p[role='alert']")).toContainText("Try again in 5 seconds");
  const retryButton = page.getByRole("button", { name: "Try again" });
  await expect(retryButton).toBeDisabled();
  await expect(
    page.locator("p[role='status']").filter({ hasText: /Try again in \d+ seconds\./ }),
  ).toBeVisible();
  await expect(retryButton).toBeEnabled({ timeout: 8_000 });
  await retryButton.click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
});

test("daily extraction limit has no countdown or retry button", async ({ page }) => {
  await mockAI(page, {
    extract: {
      status: 429,
      body: {
        error: "Today's free Gemini limit has been used up. It resets daily (midnight Pacific time). Please try again tomorrow.",
        retryAfterSeconds: null,
      },
    },
  });
  await loadSample(page);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();

  await expect(page.locator("p[role='alert']")).toContainText("used up");
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expect(page.getByText(/Try again in \d+ seconds\./)).toHaveCount(0);
});

test("daily suggestions limit still displays the score and ATS results", async ({ page }) => {
  await mockAI(page, {
    analyze: {
      body: {
        ...analyzeFixture,
        suggestions: [],
        suggestionsError:
          "Suggestions are unavailable right now (daily AI limit). Your score and ATS check are complete.",
        retryAfterSeconds: null,
      },
    },
  });
  await completeSampleAnalysis(page);

  await expect(page.getByRole("progressbar", { name: "Resume match score" })).toBeVisible();
  await expect(
    page.getByText("Suggestions are unavailable right now (daily AI limit). Your score and ATS check are complete.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await openTab(page, "ATS check");
  await expect(page.getByText("ATS score: 88/100")).toBeVisible();
});

test("renders the not-found page with navigation links", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page.getByRole("heading", { name: /We couldn.t find that page\./ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Analyze a resume" })).toHaveAttribute(
    "href",
    "/analyze",
  );
});
