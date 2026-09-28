-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "isDevStub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "publicNotes" TEXT,
ADD COLUMN     "year" INTEGER;

-- CreateTable
CREATE TABLE "SavedCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedCase_caseId_idx" ON "SavedCase"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCase_userId_caseId_key" ON "SavedCase"("userId", "caseId");

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCase" ADD CONSTRAINT "SavedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
