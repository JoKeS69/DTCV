-- AlterTable: consent_log on main site database

CREATE TABLE "consent_log" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "consent_log_visitorKey_policyVersion_idx" ON "consent_log"("visitorKey", "policyVersion");

CREATE INDEX "consent_log_createdAt_idx" ON "consent_log"("createdAt");
