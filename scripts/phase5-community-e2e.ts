/**
 * Phase 5 community smoke test (Playwright).
 * Verifies: login → discussion create → comment → reply → like → report → soft-delete.
 */
import "dotenv/config";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const stamp = Date.now();
  const title = `[E2E] Community theory ${stamp}`;

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/cases/dev-case-database-wiring-stub`);
  await page.getByRole("button", { name: /start discussion/i }).click();
  await page.locator('input[maxlength="160"]').fill(title);
  await page.locator("textarea").first().fill(
    "E2E opening post labeled USER THEORY — no accusations, wiring check only.",
  );
  await Promise.all([
    page.waitForURL(/\/discussions\//, { timeout: 15000 }),
    page.getByRole("button", { name: /post discussion/i }).click(),
  ]);

  const discussionUrl = page.url();
  const discussionId = discussionUrl.split("/discussions/")[1]?.split("?")[0];
  if (!discussionId) throw new Error("No discussion id in URL");

  await page.locator('textarea[placeholder*="comment"]').fill("E2E top-level comment.");
  await page.getByRole("button", { name: /post comment/i }).click();
  await page.getByText("E2E top-level comment.").waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: /^reply$/i }).first().click();
  await page.locator('textarea[placeholder*="reply"]').fill("E2E reply comment.");
  await page.getByRole("button", { name: /post reply/i }).click();
  await page.getByText("E2E reply comment.").waitFor({ timeout: 10000 });

  await page.getByRole("button", { name: /^like/i }).first().click();
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: /^report$/i }).first().click();
  await page.locator('input[maxlength="200"]').fill("E2E spam / test report");
  await page.getByRole("button", { name: /submit report/i }).click();
  await page.getByText(/report filed/i).waitFor({ timeout: 8000 });

  const comment = await prisma.comment.findFirst({
    where: { discussionId, body: "E2E top-level comment." },
  });
  if (!comment) throw new Error("Comment not in DB");

  const like = await prisma.commentReaction.count({
    where: { commentId: comment.id, type: "LIKE" },
  });
  if (like < 1) throw new Error("Like not persisted");

  const report = await prisma.report.findFirst({
    where: { reason: "E2E spam / test report" },
    orderBy: { createdAt: "desc" },
  });
  if (!report || report.status !== "OPEN") throw new Error("Report not created");

  // Soft-delete discussion via UI (author)
  page.once("dialog", (d) => d.accept().catch(() => undefined));
  await page.getByRole("button", { name: /soft-delete/i }).first().click();
  await page.waitForURL(/\/cases/, { timeout: 15000 });

  const deleted = await prisma.discussion.findUnique({ where: { id: discussionId } });
  if (!deleted?.deletedAt || deleted.status !== "HIDDEN") {
    throw new Error(
      `Soft-delete/status not enforced: deletedAt=${deleted?.deletedAt} status=${deleted?.status}`,
    );
  }

  await page.goto(`${BASE}/discussions/${discussionId}`);
  const body = (await page.textContent("body")) || "";
  if (!/not found|404/i.test(body)) {
    throw new Error("Expected not-found UI for soft-deleted discussion");
  }

  // Public profile
  await page.goto(`${BASE}/detectives/demo_detective`);
  await page.getByText(/detective profile/i).waitFor();
  await page.getByText("@demo_detective").waitFor();

  console.log(
    JSON.stringify(
      {
        ok: true,
        discussionId,
        commentId: comment.id,
        reportId: report.id,
        deletedAt: deleted.deletedAt,
        status: deleted.status,
      },
      null,
      2,
    ),
  );

  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
