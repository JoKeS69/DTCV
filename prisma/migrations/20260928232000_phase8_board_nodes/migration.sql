-- CreateTable
CREATE TABLE "InvestigationBoardNode" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "type" "BoardNodeType" NOT NULL,
    "refId" TEXT NOT NULL,
    "label" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationBoardNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestigationBoardNode_investigationId_idx" ON "InvestigationBoardNode"("investigationId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationBoardNode_investigationId_type_refId_key" ON "InvestigationBoardNode"("investigationId", "type", "refId");

-- AddForeignKey
ALTER TABLE "InvestigationBoardNode" ADD CONSTRAINT "InvestigationBoardNode_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
