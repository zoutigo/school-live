-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvaluationScoreStatus" AS ENUM ('ENTERED', 'ABSENT', 'EXCUSED', 'NOT_GRADED');

-- CreateEnum
CREATE TYPE "EvaluationAuditAction" AS ENUM ('CREATED', 'UPDATED', 'PUBLISHED', 'SCORES_UPDATED');

-- CreateEnum
CREATE TYPE "TermReportStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "SubjectBranch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationType" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectBranchId" TEXT,
    "evaluationTypeId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "term" "Term" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAttachment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "sizeLabel" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEvaluationScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "comment" TEXT,
    "status" "EvaluationScoreStatus" NOT NULL DEFAULT 'ENTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAuditLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "EvaluationAuditAction" NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "status" "TermReportStatus" NOT NULL DEFAULT 'DRAFT',
    "councilHeldAt" TIMESTAMP(3),
    "generalAppreciation" TEXT,
    "publishedAt" TIMESTAMP(3),
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTermReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermReportEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "appreciation" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTermReportEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectBranch_schoolId_idx" ON "SubjectBranch"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectBranch_subjectId_idx" ON "SubjectBranch"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectBranch_subjectId_name_key" ON "SubjectBranch"("subjectId", "name");

-- CreateIndex
CREATE INDEX "EvaluationType_schoolId_idx" ON "EvaluationType"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationType_schoolId_code_key" ON "EvaluationType"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationType_schoolId_label_key" ON "EvaluationType"("schoolId", "label");

-- CreateIndex
CREATE INDEX "Evaluation_schoolId_idx" ON "Evaluation"("schoolId");

-- CreateIndex
CREATE INDEX "Evaluation_schoolYearId_idx" ON "Evaluation"("schoolYearId");

-- CreateIndex
CREATE INDEX "Evaluation_classId_subjectId_term_createdAt_idx" ON "Evaluation"("classId", "subjectId", "term", "createdAt");

-- CreateIndex
CREATE INDEX "Evaluation_subjectBranchId_idx" ON "Evaluation"("subjectBranchId");

-- CreateIndex
CREATE INDEX "Evaluation_evaluationTypeId_idx" ON "Evaluation"("evaluationTypeId");

-- CreateIndex
CREATE INDEX "Evaluation_authorUserId_idx" ON "Evaluation"("authorUserId");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_schoolId_idx" ON "EvaluationAttachment"("schoolId");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_evaluationId_idx" ON "EvaluationAttachment"("evaluationId");

-- CreateIndex
CREATE INDEX "StudentEvaluationScore_studentId_idx" ON "StudentEvaluationScore"("studentId");

-- CreateIndex
CREATE INDEX "StudentEvaluationScore_evaluationId_status_idx" ON "StudentEvaluationScore"("evaluationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEvaluationScore_evaluationId_studentId_key" ON "StudentEvaluationScore"("evaluationId", "studentId");

-- CreateIndex
CREATE INDEX "EvaluationAuditLog_schoolId_idx" ON "EvaluationAuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "EvaluationAuditLog_evaluationId_createdAt_idx" ON "EvaluationAuditLog"("evaluationId", "createdAt");

-- CreateIndex
CREATE INDEX "EvaluationAuditLog_actorUserId_idx" ON "EvaluationAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "StudentTermReport_schoolId_idx" ON "StudentTermReport"("schoolId");

-- CreateIndex
CREATE INDEX "StudentTermReport_classId_term_idx" ON "StudentTermReport"("classId", "term");

-- CreateIndex
CREATE INDEX "StudentTermReport_studentId_term_idx" ON "StudentTermReport"("studentId", "term");

-- CreateIndex
CREATE INDEX "StudentTermReport_updatedByUserId_idx" ON "StudentTermReport"("updatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTermReport_schoolYearId_classId_studentId_term_key" ON "StudentTermReport"("schoolYearId", "classId", "studentId", "term");

-- CreateIndex
CREATE INDEX "StudentTermReportEntry_schoolId_idx" ON "StudentTermReportEntry"("schoolId");

-- CreateIndex
CREATE INDEX "StudentTermReportEntry_reportId_idx" ON "StudentTermReportEntry"("reportId");

-- CreateIndex
CREATE INDEX "StudentTermReportEntry_subjectId_idx" ON "StudentTermReportEntry"("subjectId");

-- CreateIndex
CREATE INDEX "StudentTermReportEntry_updatedByUserId_idx" ON "StudentTermReportEntry"("updatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTermReportEntry_reportId_subjectId_key" ON "StudentTermReportEntry"("reportId", "subjectId");

-- AddForeignKey
ALTER TABLE "SubjectBranch" ADD CONSTRAINT "SubjectBranch_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectBranch" ADD CONSTRAINT "SubjectBranch_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationType" ADD CONSTRAINT "EvaluationType_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_subjectBranchId_fkey" FOREIGN KEY ("subjectBranchId") REFERENCES "SubjectBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluationTypeId_fkey" FOREIGN KEY ("evaluationTypeId") REFERENCES "EvaluationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttachment" ADD CONSTRAINT "EvaluationAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttachment" ADD CONSTRAINT "EvaluationAttachment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEvaluationScore" ADD CONSTRAINT "StudentEvaluationScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEvaluationScore" ADD CONSTRAINT "StudentEvaluationScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAuditLog" ADD CONSTRAINT "EvaluationAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAuditLog" ADD CONSTRAINT "EvaluationAuditLog_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAuditLog" ADD CONSTRAINT "EvaluationAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReportEntry" ADD CONSTRAINT "StudentTermReportEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReportEntry" ADD CONSTRAINT "StudentTermReportEntry_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "StudentTermReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReportEntry" ADD CONSTRAINT "StudentTermReportEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReportEntry" ADD CONSTRAINT "StudentTermReportEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ClassTimetableSlot_class_weekday_start_active_range_idx" RENAME TO "ClassTimetableSlot_classId_weekday_startMinute_activeFromDa_idx";

-- RenameIndex
ALTER INDEX "ClassTimetableSlot_room_weekday_start_active_range_idx" RENAME TO "ClassTimetableSlot_room_weekday_startMinute_activeFromDate__idx";

-- RenameIndex
ALTER INDEX "ClassTimetableSlot_teacher_weekday_start_active_range_idx" RENAME TO "ClassTimetableSlot_teacherUserId_weekday_startMinute_active_idx";

