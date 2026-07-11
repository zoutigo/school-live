-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('ASSESSMENT', 'EXAM');

-- CreateEnum
CREATE TYPE "ResourceExamType" AS ENUM ('SEQUENCE_TEST', 'POP_QUIZ', 'MOCK_EXAM');

-- CreateEnum
CREATE TYPE "ResourceApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResourceAttachmentPart" AS ENUM ('STATEMENT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "ResourceAuditAction" AS ENUM ('SUBMIT', 'EDIT', 'APPROVE_STATEMENT', 'REJECT_STATEMENT', 'REVOKE_STATEMENT', 'APPROVE_CORRECTION', 'REJECT_CORRECTION', 'REVOKE_CORRECTION');

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "schoolId" TEXT,
    "academicLevelId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "examType" "ResourceExamType" NOT NULL,
    "sequence" "Sequence",
    "title" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "statementContent" TEXT NOT NULL,
    "statementStatus" "ResourceApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "statementApprovedByUserId" TEXT,
    "statementApprovedAt" TIMESTAMP(3),
    "correctionContent" TEXT,
    "correctionStatus" "ResourceApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "correctionApprovedByUserId" TEXT,
    "correctionApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAttachment" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "part" "ResourceAttachmentPart" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sizeLabel" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceFavorite" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceAuditLog" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ResourceAuditAction" NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resource_kind_academicLevelId_subjectId_sequence_idx" ON "Resource"("kind", "academicLevelId", "subjectId", "sequence");

-- CreateIndex
CREATE INDEX "Resource_kind_statementStatus_idx" ON "Resource"("kind", "statementStatus");

-- CreateIndex
CREATE INDEX "Resource_schoolId_idx" ON "Resource"("schoolId");

-- CreateIndex
CREATE INDEX "Resource_authorUserId_idx" ON "Resource"("authorUserId");

-- CreateIndex
CREATE INDEX "ResourceAttachment_resourceId_part_idx" ON "ResourceAttachment"("resourceId", "part");

-- CreateIndex
CREATE INDEX "ResourceFavorite_userId_idx" ON "ResourceFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceFavorite_resourceId_userId_key" ON "ResourceFavorite"("resourceId", "userId");

-- CreateIndex
CREATE INDEX "ResourceAuditLog_resourceId_createdAt_idx" ON "ResourceAuditLog"("resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceAuditLog_actorUserId_idx" ON "ResourceAuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_statementApprovedByUserId_fkey" FOREIGN KEY ("statementApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_correctionApprovedByUserId_fkey" FOREIGN KEY ("correctionApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAttachment" ADD CONSTRAINT "ResourceAttachment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFavorite" ADD CONSTRAINT "ResourceFavorite_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceFavorite" ADD CONSTRAINT "ResourceFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAuditLog" ADD CONSTRAINT "ResourceAuditLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAuditLog" ADD CONSTRAINT "ResourceAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
