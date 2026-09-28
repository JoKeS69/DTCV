-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_paymentSubscriptionId_key" ON "User"("paymentSubscriptionId");
CREATE INDEX IF NOT EXISTS "User_paymentCustomerId_idx" ON "User"("paymentCustomerId");
CREATE INDEX IF NOT EXISTS "User_subscriptionPlan_subscriptionStatus_idx" ON "User"("subscriptionPlan", "subscriptionStatus");

-- CreateTable
CREATE TABLE IF NOT EXISTS "CheckoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "successUrl" TEXT NOT NULL,
    "cancelUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CheckoutSession_userId_status_idx" ON "CheckoutSession"("userId", "status");
CREATE INDEX IF NOT EXISTS "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");

ALTER TABLE "CheckoutSession" DROP CONSTRAINT IF EXISTS "CheckoutSession_userId_fkey";
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
