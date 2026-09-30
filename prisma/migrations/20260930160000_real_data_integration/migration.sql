-- Real-data integration: source sync fields, admin overrides, sync runs, takedowns.

-- AlterEnum CaseType (Prisma-compatible ADD VALUE)
ALTER TYPE "CaseType" ADD VALUE 'WANTED';
ALTER TYPE "CaseType" ADD VALUE 'UNIDENTIFIED';
ALTER TYPE "CaseType" ADD VALUE 'KIDNAPPING';
ALTER TYPE "CaseType" ADD VALUE 'SEEKING_INFORMATION';
ALTER TYPE "CaseType" ADD VALUE 'TERRORIST';

-- CreateEnum
CREATE TYPE "CaseDataSource" AS ENUM ('fbi', 'ncmec', 'interpol', 'namus', 'europol', 'manual');
CREATE TYPE "SourcedCaseStatus" AS ENUM ('ACTIVE', 'CAPTURED', 'RECOVERED', 'DECEASED', 'REMOVED_FROM_SOURCE', 'UNKNOWN');
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');

-- AlterTable Case
ALTER TABLE "Case" ADD COLUMN "source" "CaseDataSource",
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "sourceAttribution" TEXT,
ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "demographics" JSONB,
ADD COLUMN "physical" JSONB,
ADD COLUMN "lastKnown" TEXT,
ADD COLUMN "agency" TEXT,
ADD COLUMN "tipsText" TEXT,
ADD COLUMN "images" JSONB,
ADD COLUMN "sourceCategory" TEXT,
ADD COLUMN "sourcedStatus" "SourcedCaseStatus",
ADD COLUMN "sourceModifiedAt" TIMESTAMP(3),
ADD COLUMN "firstSeenAt" TIMESTAMP(3),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "rawPayload" JSONB;

CREATE UNIQUE INDEX "Case_source_sourceId_key" ON "Case"("source", "sourceId");
CREATE INDEX "Case_source_lastSyncedAt_idx" ON "Case"("source", "lastSyncedAt");
CREATE INDEX "Case_isHidden_published_idx" ON "Case"("isHidden", "published");
CREATE INDEX "Case_sourcedStatus_idx" ON "Case"("sourcedStatus");

CREATE TABLE "CaseAdminOverride" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "hide" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaseAdminOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaseAdminOverride_caseId_key" ON "CaseAdminOverride"("caseId");

ALTER TABLE "CaseAdminOverride" ADD CONSTRAINT "CaseAdminOverride_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" "CaseDataSource" NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "upsertedCount" INTEGER NOT NULL DEFAULT 0,
    "removedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "details" JSONB,
    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncRun_source_startedAt_idx" ON "SyncRun"("source", "startedAt");
CREATE INDEX "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");

CREATE TABLE "TakedownLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "source" "CaseDataSource",
    "sourceId" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TakedownLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TakedownLog_createdAt_idx" ON "TakedownLog"("createdAt");
CREATE INDEX "TakedownLog_caseId_idx" ON "TakedownLog"("caseId");
