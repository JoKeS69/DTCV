-- Free trial + prepaid fictional-cases access (Visa + Whish).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingPlan" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "comped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cardAutoRenew" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_accessUntil_idx" ON "User"("accessUntil");
CREATE INDEX IF NOT EXISTS "User_trialEndsAt_idx" ON "User"("trialEndsAt");
CREATE INDEX IF NOT EXISTS "User_hasUsedTrial_idx" ON "User"("hasUsedTrial");

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "cardBrand" TEXT,
    "checkoutSessionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_providerReference_key" ON "Payment"("provider", "providerReference");
CREATE INDEX IF NOT EXISTS "Payment_userId_status_idx" ON "Payment"("userId", "status");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_userId_fkey'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BillingAdminAction" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAdminAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingAdminAction_targetUserId_createdAt_idx" ON "BillingAdminAction"("targetUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingAdminAction_adminUserId_createdAt_idx" ON "BillingAdminAction"("adminUserId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingAdminAction_adminUserId_fkey'
  ) THEN
    ALTER TABLE "BillingAdminAction" ADD CONSTRAINT "BillingAdminAction_adminUserId_fkey"
      FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingAdminAction_targetUserId_fkey'
  ) THEN
    ALTER TABLE "BillingAdminAction" ADD CONSTRAINT "BillingAdminAction_targetUserId_fkey"
      FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
