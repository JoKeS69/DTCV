/**
 * Runs prior phase Playwright smoke scripts sequentially.
 * Prefer `npm run test:e2e` (Playwright Test) for Phase 13+.
 */
import { spawnSync } from "node:child_process";

const scripts = [
  "scripts/phase5-community-e2e.ts",
  "scripts/phase6-fictional-e2e.ts",
  "scripts/phase7-profile-e2e.ts",
  "scripts/phase8-board-e2e.ts",
  "scripts/phase9-admin-e2e.ts",
  "scripts/phase10-payments-e2e.ts",
];

let failed = 0;
for (const script of scripts) {
  console.log(`\n=== ${script} ===`);
  const result = spawnSync("npx", ["tsx", script], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`FAILED: ${script}`);
  }
}

if (failed) {
  console.error(`\nLegacy e2e: ${failed}/${scripts.length} failed`);
  process.exit(1);
}
console.log(`\nLegacy e2e: all ${scripts.length} passed`);
