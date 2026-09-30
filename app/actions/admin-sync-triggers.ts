"use server";

import { adminRunSync } from "@/app/actions/admin-sync";

export async function adminForceSyncAll() {
  return adminRunSync();
}

export async function adminForceSyncFbi() {
  return adminRunSync("fbi");
}
