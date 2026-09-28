/**
 * Phase 10 payments e2e (test Visa mode):
 * - free user blocked from ADVANCED case
 * - Visa checkout → PREMIUM ACTIVE
 * - cancel path → FREE
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

async function login(
  page: import("playwright").Page,
  username: string,
  password: string,
) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional|admin|pricing|billing)/, {
      timeout: 15000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
  });

  // Reset subscription to FREE for clean run
  await prisma.user.update({
    where: { id: demo.id },
    data: {
      subscriptionPlan: "FREE",
      subscriptionStatus: "FREE",
      paymentCustomerId: null,
      paymentSubscriptionId: null,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
    },
  });
  await prisma.checkoutSession.deleteMany({ where: { userId: demo.id } });

  const proCase = await prisma.fictionalCase.findUniqueOrThrow({
    where: { caseCode: "FC-002" },
    select: { slug: true, difficulty: true },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await login(page, "demo_detective", "detective-demo-2026");

  // Free user sees PRO lock on ADVANCED case
  await page.goto(`${BASE}/fictional/${proCase.slug}`);
  await page.getByText(/Investigator Pro required|PRO/i).first().waitFor({
    timeout: 10000,
  });
  console.log("OK free user gated from ADVANCED case");

  // Pricing → checkout
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("heading", { name: /^DETECTIVE$/i }).waitFor();
  await page.getByRole("button", { name: /Pay with Visa/i }).click();
  await page.waitForURL(/\/checkout\//, { timeout: 15000 });
  // If host flipped to localhost and dropped cookies, recover once.
  if (page.url().includes("/login")) {
    await login(page, "demo_detective", "detective-demo-2026");
    const callback = new URL(page.url(), BASE).searchParams.get("callbackUrl");
    await page.goto(`${BASE}${callback || "/pricing"}`);
  }
  await page.getByRole("heading", { name: /^Checkout$/i }).waitFor({
    timeout: 15000,
  });

  await page.getByLabel(/Visa number/i).fill("4111 1111 1111 1111");
  await page.getByLabel(/^MM$/i).fill("12");
  await page.getByLabel(/^YYYY$/i).fill("2030");
  await page.getByLabel(/^CVC$/i).fill("123");
  await page.getByLabel(/Cardholder/i).fill("Demo Detective");
  await page.getByRole("button", { name: /Pay .* Activate Pro/i }).click();
  await page.waitForURL(/\/billing/, { timeout: 20000 });
  await page.getByText(/Checkout complete|Investigator Pro/i).first().waitFor();

  const after = await prisma.user.findUniqueOrThrow({
    where: { id: demo.id },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      paymentSubscriptionId: true,
    },
  });
  if (after.subscriptionPlan !== "PREMIUM" || after.subscriptionStatus !== "ACTIVE") {
    throw new Error(
      `Expected PREMIUM/ACTIVE, got ${after.subscriptionPlan}/${after.subscriptionStatus}`,
    );
  }
  console.log("OK Visa checkout granted Investigator Pro");

  // Pro can open ADVANCED case brief
  await page.goto(`${BASE}/fictional/${proCase.slug}`);
  await page.getByRole("heading", { name: /SIGNAL CUT/i }).waitFor({
    timeout: 10000,
  });
  const locked = await page.getByText(/Investigator Pro required/i).count();
  if (locked > 0) throw new Error("Still locked after upgrade");
  console.log("OK premium user can open ADVANCED case");

  // Cancel immediately
  await page.goto(`${BASE}/billing`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Cancel now/i }).click();
  await page.waitForTimeout(1200);

  const canceled = await prisma.user.findUniqueOrThrow({
    where: { id: demo.id },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });
  if (canceled.subscriptionPlan !== "FREE") {
    throw new Error(`Expected FREE after cancel, got ${canceled.subscriptionPlan}`);
  }
  console.log("OK cancel downgraded to FREE");

  await browser.close();
  await prisma.$disconnect();
  console.log("Phase 10 payments e2e passed");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
