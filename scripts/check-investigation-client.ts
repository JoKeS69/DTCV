import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../lib/generated/prisma-cases/client";

async function main() {
  const url = `file:${path.resolve("data/detective_cases.db")}`;
  const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  console.log("in operator", "investigationCase" in db);
  console.log("typeof", typeof db.investigationCase);
  console.log(
    "own keys",
    Object.keys(db as object).filter((k) => /invest|case|claim/i.test(k)),
  );
  const proto = Object.getPrototypeOf(db);
  console.log(
    "proto investigationCase",
    Object.getOwnPropertyDescriptor(proto, "investigationCase"),
  );
  const rows = await db.investigationCase.findMany({
    take: 2,
    select: { slug: true, title: true },
  });
  console.log("rows", rows);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
