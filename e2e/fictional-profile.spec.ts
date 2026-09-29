import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Fictional + profile", () => {
  test("starts FC-001, submits theory, scores, and shows XP on profile", async ({
    page,
  }) => {
    const { rows: demos } = await sql<{ id: string }>(
      `SELECT id FROM "User" WHERE username = 'demo_detective'`,
    );
    const demoId = demos[0]!.id;

    const { rows: fcs } = await sql<{ id: string; slug: string }>(
      `SELECT id, slug FROM "FictionalCase" WHERE "caseCode" = 'FC-001'`,
    );
    const fc = fcs[0]!;

    const { rows: culprits } = await sql<{ id: string }>(
      `SELECT id FROM "Suspect" WHERE "fictionalCaseId" = $1 AND code = 'S2' LIMIT 1`,
      [fc.id],
    );
    const culpritId = culprits[0]!.id;

    const { rows: solutions } = await sql<{
      summary: string;
      explanation: string;
    }>(
      `SELECT summary, explanation FROM "Solution" WHERE "fictionalCaseId" = $1`,
      [fc.id],
    );
    const solution = solutions[0]!;

    await sql(
      `DELETE FROM "Investigation" WHERE "userId" = $1 AND "fictionalCaseId" = $2`,
      [demoId, fc.id],
    );

    await page.goto(`/fictional/${fc.slug}`);
    const html = await page.content();
    expect(html.includes(solution.summary)).toBe(false);
    expect(html.includes(solution.explanation.slice(0, 40))).toBe(false);

    await loginAs(page);
    await page.goto(`/fictional/${fc.slug}`);

    await page
      .getByRole("button", {
        name: /start investigation|continue investigation/i,
      })
      .click();
    await expect(
      page.getByText(/status:\s*active|ACTIVE/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByLabel(/culprit \(suspect\)/i).selectOption(culpritId);
    await page
      .getByLabel(/^motive$/i)
      .fill("Inheritance debt pressure around the estate.");
    await page
      .getByLabel(/^timeline$/i)
      .fill("Around midnight near 11:47 at the study.");
    await page
      .getByLabel(/evidence interpretation/i)
      .fill("E1 coat thread and E3 study window mark the entry.");
    await page
      .getByLabel(/^reasoning$/i)
      .fill("Window entry plus coat fiber ties the culprit to the room.");

    await page.getByRole("button", { name: /submit theory/i }).click();
    await page.waitForURL(/\/fictional\/.+\/result/, { timeout: 20_000 });
    await expect(
      page.getByText(/score|SCORECARD|\/\s*100/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/profile");
    await expect(page.getByText(/XP|detective|rank/i).first()).toBeVisible({
      timeout: 15_000,
    });

    const { rows: submissions } = await sql<{ scoreTotal: number }>(
      `SELECT ts."scoreTotal"
       FROM "TheorySubmission" ts
       JOIN "Investigation" i ON i.id = ts."investigationId"
       WHERE i."userId" = $1 AND i."fictionalCaseId" = $2
       ORDER BY ts."createdAt" DESC
       LIMIT 1`,
      [demoId, fc.id],
    );
    expect(submissions[0]?.scoreTotal).toBeGreaterThan(0);
  });
});
