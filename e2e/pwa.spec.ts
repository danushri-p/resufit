import { test, expect, type Page } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

async function waitForServiceWorker(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Reload so the page is controlled by the now-active worker.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
}

test("serves an installable web app manifest with icons", async ({ page, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({
    name: "ResuFit – AI resume analyzer",
    short_name: "ResuFit",
    start_url: "/",
    display: "standalone",
    theme_color: "#0B1020",
  });
  const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
  expect(purposes).toContain("maskable");
  for (const icon of manifest.icons as Array<{ src: string; sizes: string }>) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#0B1020");
});

test("serves the service worker without caching", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["content-type"]).toContain("javascript");
});

test("tracker works offline after the first visit", async ({ page, context }) => {
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.goto("/tracker");
  await expect(page.getByRole("heading", { name: "Application tracker" })).toBeVisible();
  await expect(page.getByText(/You're offline\. Your tracker and history still work/)).toBeVisible();

  // Fully interactive offline: data is saved in this browser.
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Role", { exact: true }).fill("Frontend Developer");
  await page.getByLabel("Company", { exact: true }).fill("BrightPath Studio");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Frontend Developer · BrightPath Studio" })).toBeVisible();

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Frontend Developer · BrightPath Studio" })).toBeVisible();
});

test("unsaved pages show the offline page and AI requests are never cached", async ({ page, context }) => {
  await waitForServiceWorker(page);
  await context.setOffline(true);

  await page.goto("/compare");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open tracker" })).toBeVisible();

  const cacheKeys = await page.evaluate(async () => {
    const keys: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) keys.push(new URL(request.url).pathname);
    }
    return keys;
  });
  expect(cacheKeys).toContain("/tracker");
  expect(cacheKeys.some((path) => path.startsWith("/api/"))).toBe(false);
});
