-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE', 'ACTIVE', 'CANCELED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "DetectiveRank" AS ENUM ('NOVICE', 'JUNIOR', 'DETECTIVE', 'SENIOR', 'ELITE', 'CHIEF');

-- CreateEnum
CREATE TYPE "ContentLabel" AS ENUM ('VERIFIED', 'REPORTED', 'USER_THEORY');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'COLD', 'UNSOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('DISAPPEARANCE', 'HOMICIDE', 'MISSING', 'UNKNOWN', 'OTHER');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CasePersonRole" AS ENUM ('VICTIM', 'WITNESS', 'PERSON_OF_INTEREST', 'RELATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscussionStatus" AS ENUM ('OPEN', 'LOCKED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('COMMENT', 'DISCUSSION', 'USER', 'CASE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FictionalDifficulty" AS ENUM ('NOVICE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHYSICAL', 'DOCUMENT', 'PHOTO', 'AUDIO', 'DIGITAL', 'FORENSIC', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestigationTarget" AS ENUM ('REAL_CASE', 'FICTIONAL_CASE');

-- CreateEnum
CREATE TYPE "BoardNodeType" AS ENUM ('EVIDENCE', 'SUSPECT', 'EVENT', 'WITNESS_STATEMENT', 'NOTE', 'PERSON', 'CUSTOM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "detectiveRank" "DetectiveRank" NOT NULL DEFAULT 'NOVICE',
ADD COLUMN     "detectiveXP" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "countryCode" TEXT,
    "type" "CaseType" NOT NULL DEFAULT 'UNKNOWN',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority" NOT NULL DEFAULT 'MEDIUM',
    "contentLabel" "ContentLabel" NOT NULL DEFAULT 'REPORTED',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSource" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publisher" TEXT,
    "accessedAt" TIMESTAMP(3),
    "citationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentLabel" "ContentLabel" NOT NULL DEFAULT 'REPORTED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePerson" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "CasePersonRole" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "contentLabel" "ContentLabel" NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "DiscussionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "contentLabel" "ContentLabel" NOT NULL DEFAULT 'USER_THEORY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FictionalCase" (
    "id" TEXT NOT NULL,
    "caseCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "setting" TEXT,
    "difficulty" "FictionalDifficulty" NOT NULL DEFAULT 'NOVICE',
    "isFictional" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FictionalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suspect" (
    "id" TEXT NOT NULL,
    "fictionalCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "occupation" TEXT,
    "bio" TEXT NOT NULL,
    "publicAlibi" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "fictionalCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL DEFAULT 'OTHER',
    "foundLocation" TEXT,
    "foundAt" TIMESTAMP(3),
    "isRedHerring" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FictionalEvent" (
    "id" TEXT NOT NULL,
    "fictionalCaseId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FictionalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WitnessStatement" (
    "id" TEXT NOT NULL,
    "fictionalCaseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "witnessName" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WitnessStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Solution" (
    "id" TEXT NOT NULL,
    "fictionalCaseId" TEXT NOT NULL,
    "culpritSuspectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "keyEvidenceCodes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investigation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "target" "InvestigationTarget" NOT NULL,
    "caseId" TEXT,
    "fictionalCaseId" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationNote" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationConnection" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "fromType" "BoardNodeType" NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" "BoardNodeType" NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowedCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseCode_key" ON "Case"("caseCode");

-- CreateIndex
CREATE UNIQUE INDEX "Case_slug_key" ON "Case"("slug");

-- CreateIndex
CREATE INDEX "CaseSource_caseId_idx" ON "CaseSource"("caseId");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_idx" ON "CaseEvent"("caseId");

-- CreateIndex
CREATE INDEX "CasePerson_caseId_idx" ON "CasePerson"("caseId");

-- CreateIndex
CREATE INDEX "Discussion_caseId_idx" ON "Discussion"("caseId");

-- CreateIndex
CREATE INDEX "Discussion_authorId_idx" ON "Discussion"("authorId");

-- CreateIndex
CREATE INDEX "Comment_discussionId_idx" ON "Comment"("discussionId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "FictionalCase_caseCode_key" ON "FictionalCase"("caseCode");

-- CreateIndex
CREATE UNIQUE INDEX "FictionalCase_slug_key" ON "FictionalCase"("slug");

-- CreateIndex
CREATE INDEX "Suspect_fictionalCaseId_idx" ON "Suspect"("fictionalCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Suspect_fictionalCaseId_code_key" ON "Suspect"("fictionalCaseId", "code");

-- CreateIndex
CREATE INDEX "Evidence_fictionalCaseId_idx" ON "Evidence"("fictionalCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_fictionalCaseId_code_key" ON "Evidence"("fictionalCaseId", "code");

-- CreateIndex
CREATE INDEX "FictionalEvent_fictionalCaseId_idx" ON "FictionalEvent"("fictionalCaseId");

-- CreateIndex
CREATE INDEX "WitnessStatement_fictionalCaseId_idx" ON "WitnessStatement"("fictionalCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "WitnessStatement_fictionalCaseId_code_key" ON "WitnessStatement"("fictionalCaseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_fictionalCaseId_key" ON "Solution"("fictionalCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Solution_culpritSuspectId_key" ON "Solution"("culpritSuspectId");

-- CreateIndex
CREATE INDEX "Investigation_userId_idx" ON "Investigation"("userId");

-- CreateIndex
CREATE INDEX "Investigation_caseId_idx" ON "Investigation"("caseId");

-- CreateIndex
CREATE INDEX "Investigation_fictionalCaseId_idx" ON "Investigation"("fictionalCaseId");

-- CreateIndex
CREATE INDEX "InvestigationNote_investigationId_idx" ON "InvestigationNote"("investigationId");

-- CreateIndex
CREATE INDEX "InvestigationConnection_investigationId_idx" ON "InvestigationConnection"("investigationId");

-- CreateIndex
CREATE INDEX "FollowedCase_caseId_idx" ON "FollowedCase"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowedCase_userId_caseId_key" ON "FollowedCase"("userId", "caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- AddForeignKey
ALTER TABLE "CaseSource" ADD CONSTRAINT "CaseSource_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspect" ADD CONSTRAINT "Suspect_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FictionalEvent" ADD CONSTRAINT "FictionalEvent_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WitnessStatement" ADD CONSTRAINT "WitnessStatement_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_culpritSuspectId_fkey" FOREIGN KEY ("culpritSuspectId") REFERENCES "Suspect"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_fictionalCaseId_fkey" FOREIGN KEY ("fictionalCaseId") REFERENCES "FictionalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationConnection" ADD CONSTRAINT "InvestigationConnection_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedCase" ADD CONSTRAINT "FollowedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedCase" ADD CONSTRAINT "FollowedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
