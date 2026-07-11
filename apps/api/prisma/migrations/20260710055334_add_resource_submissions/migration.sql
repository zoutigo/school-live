-- CreateEnum
CREATE TYPE "ResourceSubmissionStatus" AS ENUM ('DRAFT', 'AWAITING', 'APPROVED', 'REJECTED', 'DISCARDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ResourceAuditAction" ADD VALUE 'SUBMISSION_DRAFT';
ALTER TYPE "ResourceAuditAction" ADD VALUE 'SUBMISSION_SUBMIT';
ALTER TYPE "ResourceAuditAction" ADD VALUE 'SUBMISSION_APPROVE';
ALTER TYPE "ResourceAuditAction" ADD VALUE 'SUBMISSION_REJECT';
ALTER TYPE "ResourceAuditAction" ADD VALUE 'SUBMISSION_DISCARD';

-- AlterTable
ALTER TABLE "Resource" ALTER COLUMN "statementContent" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ResourceAttachment" ADD COLUMN     "submissionId" TEXT;

-- CreateTable
CREATE TABLE "ResourceSubmission" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "part" "ResourceAttachmentPart" NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ResourceSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceSubmission_resourceId_part_status_idx" ON "ResourceSubmission"("resourceId", "part", "status");

-- CreateIndex
CREATE INDEX "ResourceSubmission_authorUserId_idx" ON "ResourceSubmission"("authorUserId");

-- CreateIndex
CREATE INDEX "ResourceAttachment_submissionId_idx" ON "ResourceAttachment"("submissionId");

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSubmission" ADD CONSTRAINT "ResourceSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceAttachment" ADD CONSTRAINT "ResourceAttachment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ResourceSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: chaque Resource existante avait un contenu unique porté directement par
-- ses colonnes statementContent/correctionContent avec un seul auteur. On matérialise
-- rétroactivement cet historique sous forme de ResourceSubmission pour ne perdre
-- aucune donnée et permettre au nouveau circuit d'écriture (brouillon -> soumission ->
-- approbation) de cohabiter avec les ressources déjà en production.
INSERT INTO "ResourceSubmission" (
  "id", "resourceId", "part", "authorUserId", "content", "status",
  "reviewedByUserId", "reviewedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  'STATEMENT',
  "authorUserId",
  "statementContent",
  (CASE "statementStatus"
     WHEN 'PENDING' THEN 'AWAITING'
     WHEN 'APPROVED' THEN 'APPROVED'
     WHEN 'REJECTED' THEN 'REJECTED'
   END)::"ResourceSubmissionStatus",
  "statementApprovedByUserId",
  "statementApprovedAt",
  "createdAt",
  "updatedAt"
FROM "Resource"
WHERE "statementContent" IS NOT NULL;

INSERT INTO "ResourceSubmission" (
  "id", "resourceId", "part", "authorUserId", "content", "status",
  "reviewedByUserId", "reviewedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  "id",
  'CORRECTION',
  "authorUserId",
  "correctionContent",
  (CASE "correctionStatus"
     WHEN 'PENDING' THEN 'AWAITING'
     WHEN 'APPROVED' THEN 'APPROVED'
     WHEN 'REJECTED' THEN 'REJECTED'
   END)::"ResourceSubmissionStatus",
  "correctionApprovedByUserId",
  "correctionApprovedAt",
  "createdAt",
  "updatedAt"
FROM "Resource"
WHERE "correctionContent" IS NOT NULL;

-- Rattache les pièces jointes existantes à la soumission backfillée correspondante,
-- pour que le nouveau modèle (attachments portées par ResourceSubmission) reste
-- cohérent avec l'historique.
UPDATE "ResourceAttachment" ra
SET "submissionId" = rs."id"
FROM "ResourceSubmission" rs
WHERE rs."resourceId" = ra."resourceId"
  AND rs."part" = ra."part"
  AND ra."submissionId" IS NULL;
