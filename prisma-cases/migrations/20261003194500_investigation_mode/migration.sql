-- CreateEnum
-- SQLite: Prisma stores enums as TEXT; no CREATE TYPE.

-- CreateTable
CREATE TABLE "investigation_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "teaser" TEXT NOT NULL DEFAULT '',
    "victims" JSON NOT NULL DEFAULT '[]',
    "location" TEXT NOT NULL DEFAULT '',
    "discoveryReport" TEXT NOT NULL DEFAULT '',
    "weaponName" TEXT NOT NULL DEFAULT '',
    "weaponTrait" TEXT NOT NULL DEFAULT '',
    "locations" JSON NOT NULL DEFAULT '[]',
    "suspects" JSON NOT NULL DEFAULT '[]',
    "hasTwist" BOOLEAN NOT NULL DEFAULT false,
    "twistNote" TEXT,
    "darkerTheme" BOOLEAN NOT NULL DEFAULT false,
    "fieldAgents" JSON NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "publishedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "investigation_player_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT,
    "playerKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unsolved',
    "wrongAccusations" INTEGER NOT NULL DEFAULT 0,
    "inspectedLocationIds" JSON NOT NULL DEFAULT '[]',
    "reviewedSuspectIds" JSON NOT NULL DEFAULT '[]',
    "backgroundCheckedIds" JSON NOT NULL DEFAULT '[]',
    "alibiVerifiedIds" JSON NOT NULL DEFAULT '[]',
    "boardConnections" JSON NOT NULL DEFAULT '[]',
    "caseLog" JSON NOT NULL DEFAULT '[]',
    "chatHistory" JSON NOT NULL DEFAULT '{}',
    "closedAt" DATETIME,
    "solutionReveal" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "investigation_player_states_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "investigation_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "investigation_cases_slug_key" ON "investigation_cases"("slug");

-- CreateIndex
CREATE INDEX "investigation_cases_status_idx" ON "investigation_cases"("status");

-- CreateIndex
CREATE INDEX "investigation_player_states_playerKey_idx" ON "investigation_player_states"("playerKey");

-- CreateIndex
CREATE INDEX "investigation_player_states_userId_idx" ON "investigation_player_states"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "investigation_player_states_caseId_playerKey_key" ON "investigation_player_states"("caseId", "playerKey");
