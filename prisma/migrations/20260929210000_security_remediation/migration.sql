-- Security remediation: opaque publicId, email AEAD columns, sessionVersion
-- Passwords remain in passwordHash (Argon2id going forward; bcrypt still verifiable).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailBlindIndex" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "publicId" TEXT;

-- Backfill opaque public ids (non-sequential)
UPDATE "User"
SET "publicId" = 'DET-' || upper(substr(md5(random()::text || id), 1, 8))
WHERE "publicId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailBlindIndex_key" ON "User"("emailBlindIndex");

-- Allow null plaintext email after app dual-writes ciphertext
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
