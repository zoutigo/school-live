-- DropIndex
DROP INDEX "Resource_kind_academicLevelId_subjectId_sequence_idx";

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "trackId" TEXT;

-- AlterTable
ALTER TABLE "Track" ALTER COLUMN "schoolId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Resource_kind_academicLevelId_trackId_subjectId_sequence_idx" ON "Resource"("kind", "academicLevelId", "trackId", "subjectId", "sequence");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
