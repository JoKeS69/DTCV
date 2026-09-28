import "dotenv/config";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
    select: { id: true },
  });
  const fc = await prisma.fictionalCase.findUniqueOrThrow({
    where: { caseCode: "FC-001" },
    select: { id: true, slug: true },
  });
  await prisma.investigation.deleteMany({
    where: { userId: demo.id, fictionalCaseId: fc.id },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  await page.goto("http://127.0.0.1:3000/login");
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/profile|cases|fictional/),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`http://127.0.0.1:3000/fictional/${fc.slug}`);
  await page.getByRole("button", { name: /start investigation/i }).click();
  await page.getByText(/status:\s*active/i).waitFor({ timeout: 10000 });
  console.log(
    "LINKS",
    await page.getByRole("link", { name: /board/i }).allTextContents(),
  );

  const res = await page.goto(
    `http://127.0.0.1:3000/fictional/${fc.slug}/board`,
  );
  console.log("STATUS", res?.status(), "URL", page.url());
  await page.waitForTimeout(1500);
  const main = await page.locator("main").innerText().catch(async () => {
    return (await page.content()).slice(0, 1500);
  });
  console.log("MAIN\n", main.slice(0, 1200));
  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
