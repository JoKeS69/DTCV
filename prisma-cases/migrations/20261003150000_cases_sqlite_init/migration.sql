-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "eventDateText" TEXT,
    "eventDate" DATETIME,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "labels" JSON NOT NULL DEFAULT '[]',
    "worldDomination" BOOLEAN NOT NULL DEFAULT false,
    "legalStatusNote" TEXT,
    "contentWarning" BOOLEAN NOT NULL DEFAULT true,
    "preferOfficialSources" BOOLEAN NOT NULL DEFAULT true,
    "lastReviewedAt" DATETIME,
    "needsReverify" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "publishedBy" TEXT,
    "draftContent" JSON,
    "sources" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "showOnPublish" BOOLEAN NOT NULL DEFAULT true,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "confidence" REAL,
    "verificationNotes" TEXT,
    "sources" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "claims_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "legalStatus" TEXT NOT NULL DEFAULT 'other',
    "presumptionNote" TEXT NOT NULL DEFAULT 'Presumed innocent unless proven guilty in a court of law.',
    "sources" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "people_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "research_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "plan" JSON,
    "stepsLog" JSON,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "stepsUsed" INTEGER NOT NULL DEFAULT 0,
    "costUnits" REAL NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "research_runs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "score" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "sourceUrls" JSON NOT NULL DEFAULT '[]',
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "linkedCaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "case_revisions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "snapshot" JSON NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_revisions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "takedown_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT,
    "url" TEXT,
    "contactHash" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "takedown_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
