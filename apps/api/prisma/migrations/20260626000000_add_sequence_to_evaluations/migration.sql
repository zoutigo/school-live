-- CreateEnum
CREATE TYPE "Sequence" AS ENUM ('SEQ_1', 'SEQ_2', 'SEQ_3', 'SEQ_4', 'SEQ_5', 'SEQ_6');

-- AlterTable Evaluation: add sequence (nullable for now) and isFinalExam
ALTER TABLE "Evaluation" ADD COLUMN "sequence" "Sequence";
ALTER TABLE "Evaluation" ADD COLUMN "isFinalExam" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: map existing term values to first sequence of each term
-- All historical evaluations had no sequence concept → assign to first seq of their term
UPDATE "Evaluation" SET "sequence" = 'SEQ_1' WHERE "term" = 'TERM_1';
UPDATE "Evaluation" SET "sequence" = 'SEQ_3' WHERE "term" = 'TERM_2';
UPDATE "Evaluation" SET "sequence" = 'SEQ_5' WHERE "term" = 'TERM_3';

-- Make sequence NOT NULL after backfill
ALTER TABLE "Evaluation" ALTER COLUMN "sequence" SET NOT NULL;

-- Drop old term column from Evaluation (term is now derived from sequence)
ALTER TABLE "Evaluation" DROP COLUMN "term";

-- AlterTable StudentTermReportEntry: add sequence averages columns
ALTER TABLE "StudentTermReportEntry" ADD COLUMN "seq1Average" DOUBLE PRECISION;
ALTER TABLE "StudentTermReportEntry" ADD COLUMN "seq2Average" DOUBLE PRECISION;
ALTER TABLE "StudentTermReportEntry" ADD COLUMN "termAverage" DOUBLE PRECISION;

-- Update indexes on Evaluation
DROP INDEX IF EXISTS "Evaluation_classId_subjectId_term_createdAt_idx";
CREATE INDEX "Evaluation_classId_subjectId_sequence_createdAt_idx" ON "Evaluation"("classId", "subjectId", "sequence", "createdAt");
