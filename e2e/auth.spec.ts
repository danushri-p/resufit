import { test, expect } from "@playwright/test";

// CI runs without Supabase keys, so these tests cover the forms and the "not set up" state.
// The redirect rules themselves are unit-tested in tests/authRoutes.test.ts.

test("login validates fields before contacting the server", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("note")).toContainText("Accounts aren't set up on this copy of ResuFit yet");

  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter your email.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Password", { exact: true }).fill("correct horse");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(/^Accounts aren't set up on this copy of ResuFit yet\. Add the Supabase keys/)).toBeVisible();
});

test("password fields can be revealed", async ({ page }) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
});

test("signup requires a name, a valid email and an 8-character password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Enter your email.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("an expired email link shows a clear message", async ({ page }) => {
  await page.goto("/login?error=link");
  await expect(page.getByText("That link has expired or was already used. Please try again.")).toBeVisible();
});
