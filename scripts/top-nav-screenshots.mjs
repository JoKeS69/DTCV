import path from "node:path";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3000";
const OUT = "/cursor/stores/bc-2e738190-98b2-4218-a397-ce7a3653ece4/media";

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await login(page);

  await page.goto(`${BASE}/cases`, { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation", { name: "Main terminal" }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "frontend-top-nav-desktop.png"),
    fullPage: false,
  });
  console.log("wrote frontend-top-nav-desktop.png");

  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.getByText(/Investigator terminal/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT, "frontend-profile-desktop.png"),
    fullPage: false,
  });
  console.log("wrote frontend-profile-desktop.png");

  await page.goto(`${BASE}/cases`, { waitUntil: "domcontentloaded" });
  await page.getByRole("navigation", { name: "Main terminal" }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUT, "frontend-cases-desktop.png"),
    fullPage: false,
  });
  console.log("wrote frontend-cases-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/cases`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Open menu/i }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /Open menu/i }).click();
  await page.getByRole("navigation", { name: "Main terminal" }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, "frontend-top-nav-mobile.png"),
    fullPage: false,
  });
  console.log("wrote frontend-top-nav-mobile.png");

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
