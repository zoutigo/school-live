-- CreateEnum
CREATE TYPE "StudentHealthAlertLevel" AS ENUM ('INFO', 'ATTENTION', 'URGENT');

-- CreateEnum
CREATE TYPE "StudentHealthConditionType" AS ENUM ('ALLERGY', 'PATHOLOGY', 'TREATMENT', 'INSTRUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "StudentHealthReportType" AS ENUM ('MALADIE', 'TRAITEMENT', 'ACCIDENT', 'CONSULTATION', 'HOSPITALISATION', 'VACCINATION', 'RESTRICTION_SPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StudentHealthAccessAction" AS ENUM ('VIEW_CONDITIONS', 'VIEW_CARE_EVENTS', 'VIEW_REPORTS', 'VIEW_URGENCE', 'VIEW_HISTORY');

-- AlterEnum
ALTER TYPE "AppRole" ADD VALUE 'SCHOOL_HEALTH_OFFICER';

-- AlterEnum
ALTER TYPE "SchoolRole" ADD VALUE 'SCHOOL_HEALTH_OFFICER';

-- CreateTable
CREATE TABLE "StudentHealthCondition" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "StudentHealthConditionType" NOT NULL,
    "alertLevel" "StudentHealthAlertLevel" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "emergencyInstructions" TEXT,
    "isVisibleToAllTeachers" BOOLEAN NOT NULL DEFAULT false,
    "publicAlertLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentHealthCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHealthCareEvent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "alertLevel" "StudentHealthAlertLevel" NOT NULL,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHealthCareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHealthReport" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "type" "StudentHealthReportType" NOT NULL,
    "alertLevel" "StudentHealthAlertLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "sportRestriction" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "StudentHealthReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHealthAttachment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "conditionId" TEXT,
    "careEventId" TEXT,
    "reportId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "sizeLabel" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHealthAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentHealthAccessLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "StudentHealthAccessAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHealthAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentHealthCondition_schoolId_idx" ON "StudentHealthCondition"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHealthCondition_studentId_idx" ON "StudentHealthCondition"("studentId");

-- CreateIndex
CREATE INDEX "StudentHealthCondition_type_idx" ON "StudentHealthCondition"("type");

-- CreateIndex
CREATE INDEX "StudentHealthCondition_alertLevel_idx" ON "StudentHealthCondition"("alertLevel");

-- CreateIndex
CREATE INDEX "StudentHealthCondition_active_idx" ON "StudentHealthCondition"("active");

-- CreateIndex
CREATE INDEX "StudentHealthCareEvent_schoolId_idx" ON "StudentHealthCareEvent"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHealthCareEvent_studentId_idx" ON "StudentHealthCareEvent"("studentId");

-- CreateIndex
CREATE INDEX "StudentHealthCareEvent_authorUserId_idx" ON "StudentHealthCareEvent"("authorUserId");

-- CreateIndex
CREATE INDEX "StudentHealthCareEvent_occurredAt_idx" ON "StudentHealthCareEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "StudentHealthReport_schoolId_idx" ON "StudentHealthReport"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHealthReport_studentId_idx" ON "StudentHealthReport"("studentId");

-- CreateIndex
CREATE INDEX "StudentHealthReport_reportedByUserId_idx" ON "StudentHealthReport"("reportedByUserId");

-- CreateIndex
CREATE INDEX "StudentHealthReport_type_idx" ON "StudentHealthReport"("type");

-- CreateIndex
CREATE INDEX "StudentHealthReport_alertLevel_idx" ON "StudentHealthReport"("alertLevel");

-- CreateIndex
CREATE INDEX "StudentHealthReport_acknowledgedAt_idx" ON "StudentHealthReport"("acknowledgedAt");

-- CreateIndex
CREATE INDEX "StudentHealthAttachment_schoolId_idx" ON "StudentHealthAttachment"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHealthAttachment_conditionId_idx" ON "StudentHealthAttachment"("conditionId");

-- CreateIndex
CREATE INDEX "StudentHealthAttachment_careEventId_idx" ON "StudentHealthAttachment"("careEventId");

-- CreateIndex
CREATE INDEX "StudentHealthAttachment_reportId_idx" ON "StudentHealthAttachment"("reportId");

-- CreateIndex
CREATE INDEX "StudentHealthAccessLog_schoolId_idx" ON "StudentHealthAccessLog"("schoolId");

-- CreateIndex
CREATE INDEX "StudentHealthAccessLog_studentId_idx" ON "StudentHealthAccessLog"("studentId");

-- CreateIndex
CREATE INDEX "StudentHealthAccessLog_userId_idx" ON "StudentHealthAccessLog"("userId");

-- CreateIndex
CREATE INDEX "StudentHealthAccessLog_createdAt_idx" ON "StudentHealthAccessLog"("createdAt");

-- AddForeignKey
ALTER TABLE "StudentHealthCondition" ADD CONSTRAINT "StudentHealthCondition_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthCondition" ADD CONSTRAINT "StudentHealthCondition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthCondition" ADD CONSTRAINT "StudentHealthCondition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthCareEvent" ADD CONSTRAINT "StudentHealthCareEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthCareEvent" ADD CONSTRAINT "StudentHealthCareEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthCareEvent" ADD CONSTRAINT "StudentHealthCareEvent_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthReport" ADD CONSTRAINT "StudentHealthReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthReport" ADD CONSTRAINT "StudentHealthReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthReport" ADD CONSTRAINT "StudentHealthReport_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthReport" ADD CONSTRAINT "StudentHealthReport_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAttachment" ADD CONSTRAINT "StudentHealthAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAttachment" ADD CONSTRAINT "StudentHealthAttachment_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "StudentHealthCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAttachment" ADD CONSTRAINT "StudentHealthAttachment_careEventId_fkey" FOREIGN KEY ("careEventId") REFERENCES "StudentHealthCareEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAttachment" ADD CONSTRAINT "StudentHealthAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "StudentHealthReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAccessLog" ADD CONSTRAINT "StudentHealthAccessLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAccessLog" ADD CONSTRAINT "StudentHealthAccessLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentHealthAccessLog" ADD CONSTRAINT "StudentHealthAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
