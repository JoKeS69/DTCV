-- AlterTable: token usage on research_runs for PB CASE cost visibility
ALTER TABLE "research_runs" ADD COLUMN "promptTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "research_runs" ADD COLUMN "completionTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "research_runs" ADD COLUMN "totalTokens" INTEGER NOT NULL DEFAULT 0;
