import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Auth", () => {
  test("registers a new detective and lands on profile", async ({ page }) => {
    const stamp = Date.now();
    const username = `e2e_${stamp}`;

    await page.goto("/register");
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
    await expect(page.locator('input[name="displayName"]')).toHaveCount(0);
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', "e2e-test-pass-2026");
    await Promise.all([
      page.waitForURL(/\/profile/, { timeout: 20_000 }),
      page.click('button[type="submit"]'),
    ]);

    await expect(page.getByText(new RegExp(username, "i")).first()).toBeVisible({
      timeout: 15_000,
    });

    const { rows } = await sql<{
      email: string | null;
      emailEncrypted: string | null;
      emailBlindIndex: string | null;
      displayName: string | null;
      publicId: string | null;
    }>(
      `SELECT email, "emailEncrypted", "emailBlindIndex", "displayName", "publicId" FROM "User" WHERE username = $1`,
      [username],
    );
    // Signup is username+password only — no sealed email until captured later.
    expect(rows[0]?.email).toBeNull();
    expect(rows[0]?.emailEncrypted).toBeNull();
    expect(rows[0]?.emailBlindIndex).toBeNull();
    expect(rows[0]?.displayName).toBe(username);
    expect(rows[0]?.publicId).toMatch(/^DET-/);
  });

  test("logs in with demo credentials", async ({ page }) => {
    await loginAs(page);
    await page.goto("/profile");
    await expect(page.getByText(/demo_detective|DEMO/i).first()).toBeVisible();
  });

  test("rejects invalid login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="username"]', "demo_detective");
    await page.fill('input[name="password"]', "definitely-wrong-password");
    await page.click('button[type="submit"]');
    await expect(
      page.getByText(/invalid username or password|invalid credentials/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("root redirects guests to register landing", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: /CASE\/\/NET/i }),
    ).toBeVisible();
    await expect(page.getByText(/create detective identity/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
  });
});
