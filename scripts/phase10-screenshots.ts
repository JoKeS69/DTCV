import "dotenv/config";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
  });
  await prisma.user.update({
    where: { id: demo.id },
    data: {
      subscriptionPlan: "FREE",
      subscriptionStatus: "FREE",
      paymentCustomerId: null,
      paymentSubscriptionId: null,
      subscriptionCancelAtPeriodEnd: false,
    },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/pricing`);
  await page.getByRole("heading", { name: /^DETECTIVE$/i }).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase10-pricing.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /Pay with Visa/i }).click();
  await page.waitForURL(/\/checkout\//, { timeout: 15000 });
  await page.getByRole("heading", { name: /^Checkout$/i }).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase10-checkout.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /Pay .* Activate Pro/i }).click();
  await page.waitForURL(/\/billing/, { timeout: 20000 });
  await page.getByRole("heading", { name: /^Billing$/i }).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase10-billing-pro.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/fictional/signal-cut-at-dock-9`);
  await page.getByRole("heading", { name: /SIGNAL CUT/i }).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase10-pro-case-unlocked.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/pricing`);
  await page.getByRole("heading", { name: /^DETECTIVE$/i }).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase10-pricing-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  await prisma.$disconnect();
  console.log("Phase 10 screenshots written to", OUT);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
