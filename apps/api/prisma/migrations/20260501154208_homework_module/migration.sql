/*
  Warnings:

  - You are about to alter the column `deviceId` on the `MobilePushToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(191)`.
  - You are about to alter the column `deviceName` on the `MobilePushToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(191)`.
  - You are about to alter the column `appVersion` on the `MobilePushToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `projectId` on the `MobilePushToken` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(191)`.

*/
-- AlterEnum
ALTER TYPE "InlineMediaEntityType" ADD VALUE 'HOMEWORK';

-- AlterEnum
ALTER TYPE "InlineMediaScope" ADD VALUE 'HOMEWORK';

-- DropIndex
DROP INDEX "MobilePushToken_userId_schoolId_isActive_idx";

-- AlterTable
ALTER TABLE "MobilePushToken" ALTER COLUMN "deviceId" SET DATA TYPE VARCHAR(191),
ALTER COLUMN "deviceName" SET DATA TYPE VARCHAR(191),
ALTER COLUMN "appVersion" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "projectId" SET DATA TYPE VARCHAR(191);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT,
    "expectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkAttachment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "sizeLabel" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkComment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "studentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkCompletion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "doneAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Homework_schoolId_idx" ON "Homework"("schoolId");

-- CreateIndex
CREATE INDEX "Homework_schoolYearId_idx" ON "Homework"("schoolYearId");

-- CreateIndex
CREATE INDEX "Homework_classId_expectedAt_idx" ON "Homework"("classId", "expectedAt");

-- CreateIndex
CREATE INDEX "Homework_subjectId_expectedAt_idx" ON "Homework"("subjectId", "expectedAt");

-- CreateIndex
CREATE INDEX "Homework_authorUserId_idx" ON "Homework"("authorUserId");

-- CreateIndex
CREATE INDEX "HomeworkAttachment_schoolId_idx" ON "HomeworkAttachment"("schoolId");

-- CreateIndex
CREATE INDEX "HomeworkAttachment_homeworkId_idx" ON "HomeworkAttachment"("homeworkId");

-- CreateIndex
CREATE INDEX "HomeworkComment_schoolId_idx" ON "HomeworkComment"("schoolId");

-- CreateIndex
CREATE INDEX "HomeworkComment_homeworkId_createdAt_idx" ON "HomeworkComment"("homeworkId", "createdAt");

-- CreateIndex
CREATE INDEX "HomeworkComment_authorUserId_idx" ON "HomeworkComment"("authorUserId");

-- CreateIndex
CREATE INDEX "HomeworkComment_studentId_idx" ON "HomeworkComment"("studentId");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_schoolId_idx" ON "HomeworkCompletion"("schoolId");

-- CreateIndex
CREATE INDEX "HomeworkCompletion_studentId_idx" ON "HomeworkCompletion"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeworkCompletion_homeworkId_studentId_key" ON "HomeworkCompletion"("homeworkId", "studentId");

-- CreateIndex
CREATE INDEX "MobilePushToken_userId_isActive_idx" ON "MobilePushToken"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAttachment" ADD CONSTRAINT "HomeworkAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkAttachment" ADD CONSTRAINT "HomeworkAttachment_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkComment" ADD CONSTRAINT "HomeworkComment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkComment" ADD CONSTRAINT "HomeworkComment_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkComment" ADD CONSTRAINT "HomeworkComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkComment" ADD CONSTRAINT "HomeworkComment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCompletion" ADD CONSTRAINT "HomeworkCompletion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCompletion" ADD CONSTRAINT "HomeworkCompletion_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkCompletion" ADD CONSTRAINT "HomeworkCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
