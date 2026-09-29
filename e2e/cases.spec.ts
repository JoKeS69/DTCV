import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Cases", () => {
  test("shows professional empty case database when no published cases", async ({
    page,
  }) => {
    await page.goto("/cases");
    await expect(page.getByText(/CASE DATABASE|> CASES/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("CASE//NET").first()).toBeVisible();
    await expect(
      page.getByText(/No cases available yet\.|No case files match these filters\./i).first(),
    ).toBeVisible({ timeout: 15_000 });
    // Must not serve fabricated mock crimes
    await expect(page.getByText(/Emily Carter|Yuki Tanaka/i)).toHaveCount(0);
  });

  test("filters empty table without error", async ({ page }) => {
    await page.goto("/cases");
    await page.locator('select[name="status"]').selectOption("COLD");
    await expect(page).toHaveURL(/status=COLD/);
    await expect(
      page.getByText(/No cases available yet\.|No case files match these filters\./i).first(),
    ).toBeVisible();
  });

  test("follows a published non-stub case when signed in", async ({ page }) => {
    const { rows: cases } = await sql<{ id: string; slug: string }>(
      `SELECT id, slug FROM "Case" WHERE published = true AND "isDevStub" = false ORDER BY "updatedAt" DESC LIMIT 1`,
    );
    test.skip(!cases[0], "No published real cases in DB yet — skip follow flow");

    const published = cases[0]!;

    const { rows: users } = await sql<{ id: string }>(
      `SELECT id FROM "User" WHERE username = 'demo_detective'`,
    );
    test.skip(!users[0], "demo_detective missing — run npm run db:seed:dev");
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
