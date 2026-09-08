/*
  Warnings:

  - Added the required column `hintEn` to the `QuizQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hintFr` to the `QuizQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuizDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "difficulty" "QuizDifficulty" NOT NULL DEFAULT 'EASY',
ADD COLUMN     "hintEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hintFr" TEXT NOT NULL DEFAULT '';

-- The temporary defaults above only exist to satisfy existing rows; the
-- seed script (npm run -w @school-live/api seed:training-quiz:discipline-parent)
-- immediately overwrites hintFr/hintEn with real content.
