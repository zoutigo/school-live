-- Rename QuizDifficulty -> QuizStage (the training quiz's middle level becomes
-- an action-incitation stage, not just a harder question, so "difficulty"
-- no longer describes it).
ALTER TYPE "QuizDifficulty" RENAME TO "QuizStage";
ALTER TYPE "QuizStage" RENAME VALUE 'EASY' TO 'DISCOVERY';
ALTER TYPE "QuizStage" RENAME VALUE 'MEDIUM' TO 'PRACTICE';
ALTER TYPE "QuizStage" RENAME VALUE 'HARD' TO 'MASTERY';

-- AlterTable
ALTER TABLE "QuizQuestion" RENAME COLUMN "difficulty" TO "stage";
ALTER TABLE "QuizQuestion" ALTER COLUMN "stage" SET DEFAULT 'DISCOVERY';
ALTER TABLE "QuizQuestion" ALTER COLUMN "hintEn" DROP DEFAULT,
ALTER COLUMN "hintFr" DROP DEFAULT;

-- Existing progress is keyed to the old EASY/MEDIUM/HARD stage semantics and
-- has no meaning under the new Découverte/Pratique/Maîtrise stages, so it is
-- purged rather than remapped.
DELETE FROM "QuizUserQuestionProgress";
