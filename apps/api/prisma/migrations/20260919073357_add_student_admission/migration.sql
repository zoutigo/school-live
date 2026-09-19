-- CreateTable
CREATE TABLE "StudentAdmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "trackId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "confirmationSource" "EnrollmentConfirmationSource",

    CONSTRAINT "StudentAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentAdmission_schoolId_idx" ON "StudentAdmission"("schoolId");

-- CreateIndex
CREATE INDEX "StudentAdmission_schoolYearId_idx" ON "StudentAdmission"("schoolYearId");

-- CreateIndex
CREATE INDEX "StudentAdmission_studentId_idx" ON "StudentAdmission"("studentId");

-- CreateIndex
CREATE INDEX "StudentAdmission_academicLevelId_idx" ON "StudentAdmission"("academicLevelId");

-- CreateIndex
CREATE INDEX "StudentAdmission_trackId_idx" ON "StudentAdmission"("trackId");

-- CreateIndex
CREATE INDEX "StudentAdmission_createdByUserId_idx" ON "StudentAdmission"("createdByUserId");

-- CreateIndex
CREATE INDEX "StudentAdmission_confirmedByUserId_idx" ON "StudentAdmission"("confirmedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAdmission_schoolYearId_studentId_key" ON "StudentAdmission"("schoolYearId", "studentId");

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAdmission" ADD CONSTRAINT "StudentAdmission_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

