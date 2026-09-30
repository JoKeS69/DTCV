-- AlterTable
ALTER TABLE "Case" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- CreateIndex: speed map marker queries (published cases with both coords)
CREATE INDEX "Case_published_latitude_longitude_idx" ON "Case"("published", "latitude", "longitude");
