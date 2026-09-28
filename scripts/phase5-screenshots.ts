import "dotenv/config";
import { chromium } from "playwright";
import path from "node:path";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/cases/dev-case-database-wiring-stub`);
  await page.getByText("> Discussion").waitFor();
  await page.locator("text=> Discussion").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase5-case-discussion.png"),
    fullPage: false,
  });

  // Create a durable discussion for screenshots (not soft-deleted)
  const stamp = Date.now();
  await page.getByRole("button", { name: /start discussion/i }).click();
  await page.locator('input[maxlength="160"]').fill(`[DEV] Screenshot thread ${stamp}`);
  await page.locator("textarea").first().fill(
    "Screenshot discussion body — USER THEORY label required. No accusations.",
  );
  await Promise.all([
    page.waitForURL(/\/discussions\//, { timeout: 15000 }),
    page.getByRole("button", { name: /post discussion/i }).click(),
  ]);

  await page.locator('textarea[placeholder*="comment"]').fill("Screenshot comment under USER THEORY.");
  await page.getByRole("button", { name: /post comment/i }).click();
  await page.getByText("Screenshot comment under USER THEORY.").waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase5-discussion-detail.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /^report$/i }).first().click();
  await page.getByText(/file report/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase5-report-dialog.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: /cancel/i }).click();

  await page.goto(`${BASE}/detectives/demo_detective`);
  await page.getByText(/detective profile/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase5-detective-profile.png"),
    fullPage: false,
  });

  // Mobile case discussion
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/cases/dev-case-database-wiring-stub`);
  await page.locator("text=> Discussion").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase5-case-discussion-mobile.png"),
    fullPage: false,
  });

  console.log("Screenshots written to", OUT);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
