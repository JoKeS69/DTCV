import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Community", () => {
  test("creates a discussion, comments, and files a report", async ({
    page,
  }) => {
    const { rows } = await sql<{ slug: string }>(
      `SELECT slug FROM "Case" WHERE published = true AND slug LIKE '%dev-case%' LIMIT 1`,
    );
    let slug = rows[0]?.slug;
    if (!slug) {
      const fallback = await sql<{ slug: string }>(
        `SELECT slug FROM "Case" WHERE published = true ORDER BY "updatedAt" DESC LIMIT 1`,
      );
      slug = fallback.rows[0]!.slug;
    }

    const stamp = Date.now();
    const title = `[E2E13] Theory ${stamp}`;

    await loginAs(page);
    await page.goto(`/cases/${slug}`);

    await page.getByRole("button", { name: /start discussion/i }).click();
    await page.locator('input[maxlength="160"]').fill(title);
    await page
      .locator("textarea")
      .first()
      .fill(
        "E2E Phase 13 discussion body — USER THEORY label check, no guilt claims.",
      );
    await Promise.all([
      page.waitForURL(/\/discussions\//, { timeout: 20_000 }),
      page.getByRole("button", { name: /post discussion/i }).click(),
    ]);

    const discussionUrl = page.url();
    const discussionId = discussionUrl.split("/discussions/")[1]?.split("?")[0];
    expect(discussionId).toBeTruthy();

    await page
      .locator('textarea[placeholder*="comment"]')
      .fill("E2E13 top-level comment.");
    await page.getByRole("button", { name: /post comment/i }).click();
    await expect(page.getByText("E2E13 top-level comment.")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: /^report$/i }).first().click();
    await page.locator('input[maxlength="200"]').fill("E2E13 spam report");
    await page.getByRole("button", { name: /submit report/i }).click();
    await expect(page.getByText(/report filed/i)).toBeVisible({
      timeout: 10_000,
    });

    const { rows: comments } = await sql(
      `SELECT id FROM "Comment" WHERE "discussionId" = $1 AND body = $2`,
      [discussionId, "E2E13 top-level comment."],
    );
    expect(comments.length).toBe(1);

    const { rows: reports } = await sql<{ status: string }>(
      `SELECT status FROM "Report" WHERE reason = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      ["E2E13 spam report"],
    );
    expect(reports[0]?.status).toBe("OPEN");
  });
});
