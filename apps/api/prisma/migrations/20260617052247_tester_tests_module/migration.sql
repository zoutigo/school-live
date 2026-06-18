-- CreateEnum
CREATE TYPE "TestCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestCasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TestExecutionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTester" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TestCampaign" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetVersion" TEXT,
    "startsAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "status" "TestCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "module" TEXT,
    "objective" TEXT,
    "preconditions" TEXT,
    "steps" JSONB,
    "expectedResult" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "priority" "TestCasePriority" NOT NULL DEFAULT 'MEDIUM',
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCaseAudienceRole" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCaseAudienceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecution" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TestExecutionStatus" NOT NULL,
    "resultText" TEXT,
    "comment" TEXT,
    "deviceInfo" TEXT,
    "appVersion" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecutionAttachment" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestExecutionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCampaign_schoolId_status_dueAt_idx" ON "TestCampaign"("schoolId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "TestCampaign_schoolId_createdAt_idx" ON "TestCampaign"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "TestCase_campaignId_orderIndex_idx" ON "TestCase"("campaignId", "orderIndex");

-- CreateIndex
CREATE INDEX "TestCase_campaignId_priority_idx" ON "TestCase"("campaignId", "priority");

-- CreateIndex
CREATE INDEX "TestCaseAudienceRole_role_idx" ON "TestCaseAudienceRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "TestCaseAudienceRole_testCaseId_role_key" ON "TestCaseAudienceRole"("testCaseId", "role");

-- CreateIndex
CREATE INDEX "TestExecution_testCaseId_executedAt_idx" ON "TestExecution"("testCaseId", "executedAt");

-- CreateIndex
CREATE INDEX "TestExecution_userId_executedAt_idx" ON "TestExecution"("userId", "executedAt");

-- CreateIndex
CREATE INDEX "TestExecutionAttachment_executionId_idx" ON "TestExecutionAttachment"("executionId");

-- AddForeignKey
ALTER TABLE "TestCampaign" ADD CONSTRAINT "TestCampaign_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCampaign" ADD CONSTRAINT "TestCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCampaign" ADD CONSTRAINT "TestCampaign_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TestCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseAudienceRole" ADD CONSTRAINT "TestCaseAudienceRole_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecutionAttachment" ADD CONSTRAINT "TestExecutionAttachment_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "TestExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
