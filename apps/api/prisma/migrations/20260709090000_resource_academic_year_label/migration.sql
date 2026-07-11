-- AlterTable: add academicYearLabel, backfilled from createdAt (French school
-- year: Sept N -> Aug N+1), then enforced NOT NULL now that every existing
-- row has a value.
ALTER TABLE "Resource" ADD COLUMN "academicYearLabel" TEXT;

UPDATE "Resource"
SET "academicYearLabel" = CASE
  WHEN EXTRACT(MONTH FROM "createdAt") >= 9
    THEN EXTRACT(YEAR FROM "createdAt")::text || '-' || (EXTRACT(YEAR FROM "createdAt") + 1)::text
  ELSE (EXTRACT(YEAR FROM "createdAt") - 1)::text || '-' || EXTRACT(YEAR FROM "createdAt")::text
END
WHERE "academicYearLabel" IS NULL;

ALTER TABLE "Resource" ALTER COLUMN "academicYearLabel" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Resource_kind_academicYearLabel_idx" ON "Resource"("kind", "academicYearLabel");
