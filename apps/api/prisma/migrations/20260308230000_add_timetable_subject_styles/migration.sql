-- CreateTable
CREATE TABLE "ClassTimetableSubjectStyle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTimetableSubjectStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassTimetableSubjectStyle_schoolId_schoolYearId_classId_subjec_key" ON "ClassTimetableSubjectStyle"("schoolId", "schoolYearId", "classId", "subjectId");

-- CreateIndex
CREATE INDEX "ClassTimetableSubjectStyle_schoolId_schoolYearId_classId_idx" ON "ClassTimetableSubjectStyle"("schoolId", "schoolYearId", "classId");

-- CreateIndex
CREATE INDEX "ClassTimetableSubjectStyle_subjectId_idx" ON "ClassTimetableSubjectStyle"("subjectId");

-- AddForeignKey
ALTER TABLE "ClassTimetableSubjectStyle" ADD CONSTRAINT "ClassTimetableSubjectStyle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSubjectStyle" ADD CONSTRAINT "ClassTimetableSubjectStyle_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSubjectStyle" ADD CONSTRAINT "ClassTimetableSubjectStyle_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSubjectStyle" ADD CONSTRAINT "ClassTimetableSubjectStyle_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
