// Prisma 7 CLI / migrate config for the dedicated cases research database.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma-cases/schema.prisma",
  migrations: {
    path: "prisma-cases/migrations",
    seed: "tsx prisma-cases/seed.ts",
  },
  datasource: {
    url: process.env["CASES_DATABASE_URL"],
  },
});
