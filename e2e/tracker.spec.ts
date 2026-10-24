import fs from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { mockAI } from "./helpers";

async function addApplication(
  page: Page,
  values: { role: string; company: string; status?: string; followUpOn?: string; jobUrl?: string },
) {
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill(values.role);
  await page.getByLabel("Company", { exact: true }).fill(values.company);
  if (values.status) await page.getByLabel("Status", { exact: true }).selectOption(values.status);
  if (values.followUpOn) await page.getByLabel("Follow up on (optional)").fill(values.followUpOn);
  if (values.jobUrl) await page.getByLabel("Job link (optional)").fill(values.jobUrl);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${values.role} · ${values.company}` })).toBeVisible();
}

function stat(page: Page, label: string) {
  return page
    .getByRole("region", { name: "Application summary" })
    .locator("div", { has: page.getByText(label, { exact: true }) });
}

test.beforeEach(async ({ page }) => {
  await mockAI(page);
});

test("shows the empty state and validates the add form", async ({ page }) => {
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Track your first application" })).toBeVisible();

  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter the role.")).toBeVisible();
  await expect(page.getByText("Enter the company.")).toBeVisible();
  await expect(page.getByLabel("Role", { exact: true })).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Role", { exact: true }).fill("Frontend Developer");
  await page.getByLabel("Company", { exact: true }).fill("BrightPath Studio");
  await page.getByLabel("Job link (optional)").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter a link that starts with http:// or https://.")).toBeVisible();

  await page.getByLabel("Job link (optional)").fill("https://example.com/jobs/1");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Frontend Developer · BrightPath Studio" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Job posting/ })).toHaveAttribute("rel", "noopener noreferrer");
});

test("updates status, filters, edits, flags follow-ups and deletes", async ({ page }) => {
  await page.goto("/tracker");
  await addApplication(page, { role: "Frontend Developer", company: "BrightPath Studio" });
  await addApplication(page, {
    role: "Backend Developer Intern",
    company: "Harborlight Systems",
    status: "applied",
    followUpOn: "2020-01-01",
  });

  await expect(page.getByText("1 follow-up due")).toBeVisible();
  const overdueCard = page.getByRole("main").getByRole("listitem").filter({ hasText: "Backend Developer Intern" });
  await expect(overdueCard.getByText("Follow up due")).toBeVisible();
  await expect(page.getByRole("main").getByRole("listitem").first()).toContainText("Backend Developer Intern");
  await expect(stat(page, "Response rate")).toContainText("0%");

  await page
    .getByLabel("Status for Backend Developer Intern at Harborlight Systems")
    .selectOption("interviewing");
  await expect(stat(page, "Interviewing")).toContainText("1");
  await expect(stat(page, "Response rate")).toContainText("100%");

  await page.getByRole("button", { name: "Saved (1)" }).click();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("main").getByRole("listitem")).toContainText("Frontend Developer");
  await page.getByRole("button", { name: "All (2)" }).click();

  const frontendCard = page.getByRole("main").getByRole("listitem").filter({ hasText: "Frontend Developer" });
  await frontendCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Notes (optional)").fill("Portfolio review on Friday");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(frontendCard).toContainText("Portfolio review on Friday");

  await frontendCard.getByRole("button", { name: "Delete" }).click();
  await expect(frontendCard.getByText("Delete this application?")).toBeVisible();
  await frontendCard.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Backend Developer Intern · Harborlight Systems" })).toBeVisible();
  await expect(page.getByText("Track your first application")).toHaveCount(0);
});

test("exports applications as CSV", async ({ page }) => {
  await page.goto("/tracker");
  await addApplication(page, { role: "Frontend Developer", company: "BrightPath Studio" });

  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("resufit-applications.csv");
  const file = await download.path();
  const csv = await fs.readFile(file!, "utf8");
  expect(csv).toContain("Role,Company,Status,Applied on,Follow up on,Match score,Job link,Notes,Updated");
  expect(csv).toContain("Frontend Developer,BrightPath Studio,Saved");
});

test("tracks an analysis and opens it again from the tracker", async ({ page }) => {
  // Start on the tracker and navigate client-side, so the tracker page Next.js keeps
  // mounted in the background must refresh when it is shown again.
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Track your first application" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Analyze", exact: true }).click();
  await expect(page).toHaveURL("/analyze");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await page.getByRole("button", { name: "Track this application" }).click();
  await expect(page.getByText("Tracked —")).toBeVisible();

  await page.getByRole("link", { name: "View tracker" }).click();
  await expect(page).toHaveURL("/tracker");
  const card = page.getByRole("main").getByRole("listitem");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Full-Stack Developer Intern · Fictional Northstar Learning Lab");
  await expect(card).toContainText("Match 82/100");

  await card.getByRole("link", { name: "Open analysis" }).click();
  await expect(page).toHaveURL(/\/history\?open=/);
  await expect(page.getByRole("heading", { name: "Full-Stack Developer Intern" })).toBeVisible();
  // Next.js keeps recently visited pages mounted but hidden, so check only visible text.
  await page.getByRole("tab", { name: "ATS check" }).click();
  await expect(page.locator("p:visible", { hasText: "ATS score: 88/100" })).toHaveCount(1);
});

test("tracks comparison jobs separately without duplicates", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Comparison results" })).toBeVisible();

  const trackButtons = page.getByRole("button", { name: "Track this application" });
  await expect(trackButtons).toHaveCount(2);
  await trackButtons.first().click();
  await expect(page.getByText("Tracked —")).toHaveCount(1);
  await expect(trackButtons).toHaveCount(1);

  await page.goto("/tracker");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
});
