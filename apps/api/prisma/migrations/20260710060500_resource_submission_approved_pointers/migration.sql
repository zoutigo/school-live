-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "correctionSubmissionId" TEXT,
ADD COLUMN     "statementSubmissionId" TEXT;

-- Backfill: pointe chaque Resource déjà approuvée vers la ResourceSubmission
-- correspondante créée par la migration précédente, pour que la lecture des
-- pièces jointes puisse être scopée à la bonne soumission plutôt qu'à toutes
-- les soumissions concurrentes d'une même ressource/partie.
UPDATE "Resource" r
SET "statementSubmissionId" = rs."id"
FROM "ResourceSubmission" rs
WHERE rs."resourceId" = r."id"
  AND rs."part" = 'STATEMENT'
  AND rs."status" = 'APPROVED';

UPDATE "Resource" r
SET "correctionSubmissionId" = rs."id"
FROM "ResourceSubmission" rs
WHERE rs."resourceId" = r."id"
  AND rs."part" = 'CORRECTION'
  AND rs."status" = 'APPROVED';

-- CreateIndex
CREATE UNIQUE INDEX "Resource_statementSubmissionId_key" ON "Resource"("statementSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_correctionSubmissionId_key" ON "Resource"("correctionSubmissionId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_statementSubmissionId_fkey" FOREIGN KEY ("statementSubmissionId") REFERENCES "ResourceSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_correctionSubmissionId_fkey" FOREIGN KEY ("correctionSubmissionId") REFERENCES "ResourceSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
