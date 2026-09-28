-- AlterTable
ALTER TABLE "FictionalCase" ADD COLUMN     "estimatedMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Investigation" ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Solution" ADD COLUMN     "motiveKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reasoningKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timelineKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "TheorySubmission" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "suspectId" TEXT NOT NULL,
    "motive" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "evidenceInterpretation" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "scoreTotal" INTEGER NOT NULL,
    "scoreSuspect" INTEGER NOT NULL,
    "scoreMotive" INTEGER NOT NULL,
    "scoreTimeline" INTEGER NOT NULL,
    "scoreEvidence" INTEGER NOT NULL,
    "scoreReasoning" INTEGER NOT NULL,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TheorySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TheorySubmission_investigationId_key" ON "TheorySubmission"("investigationId");

-- CreateIndex
CREATE INDEX "TheorySubmission_suspectId_idx" ON "TheorySubmission"("suspectId");

-- CreateIndex
CREATE INDEX "Investigation_userId_fictionalCaseId_idx" ON "Investigation"("userId", "fictionalCaseId");

-- AddForeignKey
ALTER TABLE "TheorySubmission" ADD CONSTRAINT "TheorySubmission_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
