-- CreateEnum
CREATE TYPE "StudentLifeEventType" AS ENUM ('ABSENCE', 'RETARD', 'SANCTION');

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classId_schoolYearId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_studentId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_classId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_classId_schoolYearId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_schoolYearId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_studentId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_subjectId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherClassSubject" DROP CONSTRAINT "TeacherClassSubject_classId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherClassSubject" DROP CONSTRAINT "TeacherClassSubject_classId_schoolYearId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherClassSubject" DROP CONSTRAINT "TeacherClassSubject_schoolYearId_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherClassSubject" DROP CONSTRAINT "TeacherClassSubject_subjectId_schoolId_fkey";

-- DropIndex
DROP INDEX "Class_id_schoolId_key";

-- DropIndex
DROP INDEX "Class_id_schoolYearId_key";

-- DropIndex
DROP INDEX "SchoolYear_id_schoolId_key";

-- DropIndex
DROP INDEX "Student_id_schoolId_key";

-- DropIndex
DROP INDEX "Subject_id_schoolId_key";

-- CreateTable
CREATE TABLE "StudentLifeEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "schoolYearId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "type" "StudentLifeEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "justified" BOOLEAN,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLifeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentLifeEvent_schoolId_idx" ON "StudentLifeEvent"("schoolId");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_studentId_idx" ON "StudentLifeEvent"("studentId");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_classId_idx" ON "StudentLifeEvent"("classId");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_schoolYearId_idx" ON "StudentLifeEvent"("schoolYearId");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_authorUserId_idx" ON "StudentLifeEvent"("authorUserId");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_type_idx" ON "StudentLifeEvent"("type");

-- CreateIndex
CREATE INDEX "StudentLifeEvent_occurredAt_idx" ON "StudentLifeEvent"("occurredAt");

-- AddForeignKey
ALTER TABLE "StudentLifeEvent" ADD CONSTRAINT "StudentLifeEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLifeEvent" ADD CONSTRAINT "StudentLifeEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLifeEvent" ADD CONSTRAINT "StudentLifeEvent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLifeEvent" ADD CONSTRAINT "StudentLifeEvent_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLifeEvent" ADD CONSTRAINT "StudentLifeEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "TeacherClassSubject_schoolYearId_teacherUserId_classId_subjectI" RENAME TO "TeacherClassSubject_schoolYearId_teacherUserId_classId_subj_key";
