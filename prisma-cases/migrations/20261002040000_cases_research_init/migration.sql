-- CreateSchema
-- Dedicated cases research database (CASES_DATABASE_URL)

-- CreateEnum
CREATE TYPE "ResearchCaseStatus" AS ENUM ('draft', 'researching', 'pending_review', 'published', 'unpublished', 'archived');

-- CreateEnum
CREATE TYPE "ClaimReviewStatus" AS ENUM ('pending', 'approved', 'rejected', 'disputed');

-- CreateEnum
CREATE TYPE "PersonReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('new', 'accepted', 'rejected', 'dismissed');

-- CreateEnum
CREATE TYPE "TakedownRequestStatus" AS ENUM ('open', 'reviewing', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "LegalPersonStatus" AS ENUM ('unidentified', 'named_public_record', 'person_of_interest', 'charged', 'convicted', 'acquitted', 'deceased', 'other');

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "eventDateText" TEXT,
    "eventDate" TIMESTAMP(3),
    "location" TEXT,
    "status" "ResearchCaseStatus" NOT NULL DEFAULT 'draft',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "worldDomination" BOOLEAN NOT NULL DEFAULT false,
    "legalStatusNote" TEXT,
    "contentWarning" BOOLEAN NOT NULL DEFAULT true,
    "preferOfficialSources" BOOLEAN NOT NULL DEFAULT true,
    "lastReviewedAt" TIMESTAMP(3),
    "needsReverify" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "draftContent" JSONB,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "ClaimReviewStatus" NOT NULL DEFAULT 'pending',
    "showOnPublish" BOOLEAN NOT NULL DEFAULT true,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "verificationNotes" TEXT,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'other',
    "status" "PersonReviewStatus" NOT NULL DEFAULT 'pending',
    "legalStatus" "LegalPersonStatus" NOT NULL DEFAULT 'other',
    "presumptionNote" TEXT NOT NULL DEFAULT 'Presumed innocent unless proven guilty in a court of law.',
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_runs" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'queued',
    "plan" JSONB,
    "stepsLog" JSONB,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "stepsUsed" INTEGER NOT NULL DEFAULT 0,
    "costUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CandidateStatus" NOT NULL DEFAULT 'new',
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "linkedCaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_revisions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takedown_requests" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "url" TEXT,
    "contactHash" TEXT,
    "reason" TEXT NOT NULL,
    "status" "TakedownRequestStatus" NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "takedown_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_slug_key" ON "cases"("slug");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_worldDomination_status_idx" ON "cases"("worldDomination", "status");

-- CreateIndex
CREATE INDEX "cases_needsReverify_idx" ON "cases"("needsReverify");

-- CreateIndex
CREATE INDEX "claims_caseId_status_idx" ON "claims"("caseId", "status");

-- CreateIndex
CREATE INDEX "people_caseId_status_idx" ON "people"("caseId", "status");

-- CreateIndex
CREATE INDEX "research_runs_caseId_status_idx" ON "research_runs"("caseId", "status");

-- CreateIndex
CREATE INDEX "research_runs_status_idx" ON "research_runs"("status");

-- CreateIndex
CREATE INDEX "candidates_status_score_idx" ON "candidates"("status", "score");

-- CreateIndex
CREATE INDEX "case_revisions_caseId_createdAt_idx" ON "case_revisions"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "takedown_requests_status_createdAt_idx" ON "takedown_requests"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_revisions" ADD CONSTRAINT "case_revisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
