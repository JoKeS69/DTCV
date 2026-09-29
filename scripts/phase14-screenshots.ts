/**
 * Phase 14 design/production screenshots → agent media store.
 */
import "dotenv/config";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUT, "phase14-home-desktop.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUT, "phase14-login-desktop.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/cases`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUT, "phase14-cases-desktop.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/cases`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUT, "phase14-cases-mobile.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(OUT, "phase14-home-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Phase 14 screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
