-- AlterTable
ALTER TABLE "AcademicLevel" ADD COLUMN     "order" INTEGER;

-- CreateTable
CREATE TABLE "SchoolAcademicLevel" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAcademicLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolAcademicLevel_schoolId_idx" ON "SchoolAcademicLevel"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolAcademicLevel_academicLevelId_idx" ON "SchoolAcademicLevel"("academicLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAcademicLevel_schoolId_academicLevelId_key" ON "SchoolAcademicLevel"("schoolId", "academicLevelId");

-- CreateIndex
CREATE INDEX "AcademicLevel_order_idx" ON "AcademicLevel"("order");

-- AddForeignKey
ALTER TABLE "SchoolAcademicLevel" ADD CONSTRAINT "SchoolAcademicLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAcademicLevel" ADD CONSTRAINT "SchoolAcademicLevel_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
