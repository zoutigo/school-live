-- CreateTable
CREATE TABLE "NationalCycle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NationalCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NationalCycle_code_key" ON "NationalCycle"("code");

-- Seed the two cycles that previously existed as enum values
INSERT INTO "NationalCycle" ("id", "code", "label", "updatedAt")
VALUES
    ('cycle_primary', 'PRIMARY', 'Primaire', CURRENT_TIMESTAMP),
    ('cycle_secondary', 'SECONDARY', 'Secondaire', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "AcademicLevel" ADD COLUMN     "cycleId" TEXT;

-- Migrate existing enum values to the new relation
UPDATE "AcademicLevel"
SET "cycleId" = CASE "cycle"
    WHEN 'PRIMARY' THEN 'cycle_primary'
    WHEN 'SECONDARY' THEN 'cycle_secondary'
    ELSE NULL
END;

-- AlterTable
ALTER TABLE "AcademicLevel" DROP COLUMN "cycle";

-- CreateIndex
CREATE INDEX "AcademicLevel_cycleId_idx" ON "AcademicLevel"("cycleId");

-- AddForeignKey
ALTER TABLE "AcademicLevel" ADD CONSTRAINT "AcademicLevel_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "NationalCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
