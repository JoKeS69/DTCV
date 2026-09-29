import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Cases", () => {
  test("browses case database and opens a case", async ({ page }) => {
    await page.goto("/cases");
    await expect(
      page.getByRole("heading", { name: /global case files/i }),
    ).toBeVisible({ timeout: 15_000 });

    const { rows } = await sql<{ slug: string; caseCode: string }>(
      `SELECT slug, "caseCode" FROM "Case" WHERE published = true ORDER BY "updatedAt" DESC LIMIT 1`,
    );
    expect(rows[0]).toBeTruthy();
    const published = rows[0]!;

    await page.getByRole("link", { name: published.caseCode }).first().click();
    await expect(page).toHaveURL(new RegExp(`select=${published.slug}`));
    await page.getByRole("link", { name: /view full case/i }).click();
    await expect(page).toHaveURL(new RegExp(`/cases/${published.slug}`));
    await expect(
      page.getByText(new RegExp(published.caseCode, "i")).first(),
    ).toBeVisible();
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
