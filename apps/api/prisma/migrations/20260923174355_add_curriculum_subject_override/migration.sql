-- CreateTable
CREATE TABLE "CurriculumSubjectOverride" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "action" "OverrideAction" NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "coefficientOverride" DOUBLE PRECISION,
    "weeklyHoursOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumSubjectOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumSubjectOverride_schoolId_idx" ON "CurriculumSubjectOverride"("schoolId");

-- CreateIndex
CREATE INDEX "CurriculumSubjectOverride_curriculumId_idx" ON "CurriculumSubjectOverride"("curriculumId");

-- CreateIndex
CREATE INDEX "CurriculumSubjectOverride_subjectId_idx" ON "CurriculumSubjectOverride"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumSubjectOverride_schoolId_curriculumId_subjectId_key" ON "CurriculumSubjectOverride"("schoolId", "curriculumId", "subjectId");

-- AddForeignKey
ALTER TABLE "CurriculumSubjectOverride" ADD CONSTRAINT "CurriculumSubjectOverride_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubjectOverride" ADD CONSTRAINT "CurriculumSubjectOverride_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubjectOverride" ADD CONSTRAINT "CurriculumSubjectOverride_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
