import "dotenv/config";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await desktop.goto(`${BASE}/cases`, { waitUntil: "networkidle" });
  await desktop.screenshot({
    path: join(OUT, "phase14-design-final-desktop.png"),
    fullPage: false,
  });
  await desktop.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await desktop.screenshot({
    path: join(OUT, "phase14-design-final-login.png"),
    fullPage: false,
  });

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.goto(`${BASE}/cases`, { waitUntil: "networkidle" });
  await mobile.screenshot({
    path: join(OUT, "phase14-design-final-mobile.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Wrote phase14-design-final-*.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
