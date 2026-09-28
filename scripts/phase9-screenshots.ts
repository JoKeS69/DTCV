import "dotenv/config";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "admin_ops");
  await page.fill('input[name="password"]', "detective-admin-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional|admin)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/admin`);
  await page.getByText(/Command overview/i).waitFor({ timeout: 15000 });
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-overview.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/admin/users`);
  await page.getByText(/^Users$/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-users.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/admin/cases`);
  await page.getByText(/Real cases/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-cases.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/admin/moderation`);
  await page.getByText(/^Moderation$/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-moderation.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/admin/subscriptions`);
  await page.getByText(/^Subscriptions$/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-subscriptions.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin`);
  await page.getByText(/Command overview/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase9-admin-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Phase 9 screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
