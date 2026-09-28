import "dotenv/config";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/profile`);
  await page.getByText(/DETECTIVE #/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase7-profile-identity.png"),
    fullPage: false,
  });

  await page.locator("text=> Statistics").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase7-profile-stats.png"),
    fullPage: false,
  });

  await page.locator("text=> Achievements").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase7-profile-achievements.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/detectives/demo_detective`);
  await page.getByText(/DETECTIVE #/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase7-public-dossier.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/fictional/rankings`);
  await page.getByText(/Fictional rankings/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase7-rankings.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/profile`);
  await page.screenshot({
    path: path.join(OUT, "phase7-profile-mobile.png"),
    fullPage: false,
  });

  console.log("Screenshots written to", OUT);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
