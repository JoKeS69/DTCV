import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Cases", () => {
  test("browses CASE//NET HUD and selects a case", async ({ page }) => {
    await page.goto("/cases");
    await expect(page.getByText(/CASE DATABASE|> CASES/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("CASE//NET").first()).toBeVisible();

    await page.getByRole("link", { name: "25-00217" }).first().click();
    await expect(page).toHaveURL(/select=25-00217/);
    await expect(page.getByText(/Disappearance - Yuki Tanaka/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view full case/i })).toBeVisible();
  });

  test("filters HUD case table by status", async ({ page }) => {
    await page.goto("/cases");
    await page.locator('select[name="status"]').selectOption("COLD");
    await expect(page).toHaveURL(/status=COLD/);
    await expect(page.getByText("23-10441").first()).toBeVisible();
    await expect(page.getByText("25-00217")).toHaveCount(0);
  });

  test("follows a published case when signed in", async ({ page }) => {
    const { rows: cases } = await sql<{ id: string; slug: string }>(
      `SELECT id, slug FROM "Case" WHERE published = true ORDER BY "updatedAt" DESC LIMIT 1`,
    );
    expect(cases[0]).toBeTruthy();
    const published = cases[0]!;

    const { rows: users } = await sql<{ id: string }>(
      `SELECT id FROM "User" WHERE username = 'demo_detective'`,
    );
    const demoId = users[0]!.id;

    await sql(`DELETE FROM "FollowedCase" WHERE "userId" = $1 AND "caseId" = $2`, [
      demoId,
      published.id,
    ]);

    await loginAs(page);
    await page.goto(`/cases/${published.slug}`);
    await page.getByRole("button", { name: /follow case/i }).click();
    await expect(
      page.getByRole("button", { name: /unfollow/i }),
    ).toBeVisible({ timeout: 10_000 });

    const { rows: followed } = await sql(
      `SELECT id FROM "FollowedCase" WHERE "userId" = $1 AND "caseId" = $2`,
      [demoId, published.id],
    );
    expect(followed.length).toBe(1);
  });
});
