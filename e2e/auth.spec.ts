import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Auth", () => {
  test("registers a new detective and lands on profile", async ({ page }) => {
    const stamp = Date.now();
    const username = `e2e_${stamp}`;
    const email = `e2e_${stamp}@example.com`;

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="displayName"]', `E2E ${stamp}`);
    await page.fill('input[name="password"]', "e2e-test-pass-2026");
    await Promise.all([
      page.waitForURL(/\/profile/, { timeout: 20_000 }),
      page.click('button[type="submit"]'),
    ]);

    await expect(page.getByText(new RegExp(username, "i")).first()).toBeVisible({
      timeout: 15_000,
    });

    const { rows } = await sql<{ email: string }>(
      `SELECT email FROM "User" WHERE username = $1`,
      [username],
    );
    expect(rows[0]?.email).toBe(email);
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
});
