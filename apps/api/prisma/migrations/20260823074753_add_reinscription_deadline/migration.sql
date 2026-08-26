-- CreateTable
CREATE TABLE "ReinscriptionDeadline" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReinscriptionDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReinscriptionDeadline_schoolId_idx" ON "ReinscriptionDeadline"("schoolId");

-- CreateIndex
CREATE INDEX "ReinscriptionDeadline_academicLevelId_idx" ON "ReinscriptionDeadline"("academicLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "ReinscriptionDeadline_schoolYearId_academicLevelId_key" ON "ReinscriptionDeadline"("schoolYearId", "academicLevelId");

-- AddForeignKey
ALTER TABLE "ReinscriptionDeadline" ADD CONSTRAINT "ReinscriptionDeadline_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReinscriptionDeadline" ADD CONSTRAINT "ReinscriptionDeadline_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReinscriptionDeadline" ADD CONSTRAINT "ReinscriptionDeadline_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
