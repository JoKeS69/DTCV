import { expect, test } from "@playwright/test";
import { loginAs, sql } from "./helpers";

test.describe("Visa payments (test mode)", () => {
  test("subscribes with test Visa PAN then cancels to FREE", async ({
    page,
  }) => {
    const { rows: demos } = await sql<{ id: string }>(
      `SELECT id FROM "User" WHERE username = 'demo_detective'`,
    );
    const demoId = demos[0]!.id;

    await sql(
      `UPDATE "User" SET
        "subscriptionPlan" = 'FREE',
        "subscriptionStatus" = 'FREE',
        "paymentCustomerId" = NULL,
        "paymentSubscriptionId" = NULL,
        "subscriptionCurrentPeriodEnd" = NULL,
        "subscriptionCancelAtPeriodEnd" = false
      WHERE id = $1`,
      [demoId],
    );
    await sql(`DELETE FROM "CheckoutSession" WHERE "userId" = $1`, [demoId]);

    await loginAs(page);

    await page.goto("/pricing");
    await page.getByRole("button", { name: /Pay with Visa/i }).click();
    await page.waitForURL(/\/checkout\//, { timeout: 20_000 });

    if (page.url().includes("/login")) {
      await loginAs(page);
      await page.goto("/pricing");
      await page.getByRole("button", { name: /Pay with Visa/i }).click();
      await page.waitForURL(/\/checkout\//, { timeout: 20_000 });
    }

    await expect(
      page.getByRole("heading", { name: /^Checkout$/i }),
    ).toBeVisible();
    await page.getByLabel(/Visa number/i).fill("4111 1111 1111 1111");
    await page.getByLabel(/^MM$/i).fill("12");
    await page.getByLabel(/^YYYY$/i).fill("2030");
    await page.getByLabel(/^CVC$/i).fill("123");
    await page.getByLabel(/Cardholder/i).fill("Demo Detective");
    await page.getByRole("button", { name: /Pay .* Activate Pro/i }).click();
    await page.waitForURL(/\/billing/, { timeout: 25_000 });
    await expect(
      page.getByText(/Checkout complete|Investigator Pro|ACTIVE/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(
        async () => {
          const { rows } = await sql<{
            subscriptionPlan: string;
            subscriptionStatus: string;
          }>(
            `SELECT "subscriptionPlan", "subscriptionStatus" FROM "User" WHERE id = $1`,
            [demoId],
          );
          return `${rows[0]?.subscriptionPlan}/${rows[0]?.subscriptionStatus}`;
        },
        { timeout: 15_000 },
      )
      .toBe("PREMIUM/ACTIVE");

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /Cancel now/i }).click();

    await expect
      .poll(
        async () => {
          const { rows } = await sql<{
            subscriptionPlan: string;
            subscriptionStatus: string;
          }>(
            `SELECT "subscriptionPlan", "subscriptionStatus" FROM "User" WHERE id = $1`,
            [demoId],
          );
          return `${rows[0]?.subscriptionPlan}/${rows[0]?.subscriptionStatus}`;
        },
        { timeout: 15_000 },
      )
      .toBe("FREE/CANCELED");
  });
});
