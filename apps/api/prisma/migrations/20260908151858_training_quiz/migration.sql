-- CreateEnum
CREATE TYPE "QuizQuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE');

-- CreateTable
CREATE TABLE "QuizChapter" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT NOT NULL,
    "colorFrom" TEXT NOT NULL,
    "colorTo" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionFr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuizQuestionType" NOT NULL DEFAULT 'MCQ_SINGLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "textFr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "explanationFr" TEXT NOT NULL,
    "explanationEn" TEXT NOT NULL,
    "imageUrl" TEXT,
    "deepLinkRoute" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswerOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "textFr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,

    CONSTRAINT "QuizAnswerOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizUserQuestionProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "solvedAt" TIMESTAMP(3),
    "lastAnsweredAt" TIMESTAMP(3),

    CONSTRAINT "QuizUserQuestionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizChapter_role_isActive_idx" ON "QuizChapter"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "QuizChapter_role_moduleKey_key" ON "QuizChapter"("role", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_chapterId_order_key" ON "QuizQuestion"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswerOption_questionId_order_key" ON "QuizAnswerOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "QuizUserQuestionProgress_userId_solved_idx" ON "QuizUserQuestionProgress"("userId", "solved");

-- CreateIndex
CREATE UNIQUE INDEX "QuizUserQuestionProgress_userId_questionId_key" ON "QuizUserQuestionProgress"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "QuizChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswerOption" ADD CONSTRAINT "QuizAnswerOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizUserQuestionProgress" ADD CONSTRAINT "QuizUserQuestionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizUserQuestionProgress" ADD CONSTRAINT "QuizUserQuestionProgress_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
