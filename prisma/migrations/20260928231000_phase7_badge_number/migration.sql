-- AlterTable: badge numbers for DETECTIVE # identity
CREATE SEQUENCE IF NOT EXISTS "User_badgeNumber_seq";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "badgeNumber" INTEGER;

UPDATE "User" SET "badgeNumber" = sub.n
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS n
  FROM "User"
) AS sub
WHERE "User".id = sub.id AND "User"."badgeNumber" IS NULL;

ALTER TABLE "User" ALTER COLUMN "badgeNumber" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "badgeNumber" SET DEFAULT nextval('"User_badgeNumber_seq"');

-- Postgres sequences start at 1; setval(..., 0) is rejected.
-- Empty table: setval(1, false) → next nextval() returns 1.
-- Non-empty: setval(MAX, true) → next nextval() returns MAX+1.
SELECT setval(
  '"User_badgeNumber_seq"',
  GREATEST(COALESCE((SELECT MAX("badgeNumber") FROM "User"), 1), 1),
  (SELECT COALESCE(MAX("badgeNumber"), 0) > 0 FROM "User")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_badgeNumber_key" ON "User"("badgeNumber");
