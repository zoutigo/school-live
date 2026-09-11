-- CreateTable
CREATE TABLE "QuizChapterLevel" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "stage" "QuizStage" NOT NULL,
    "objectiveFr" TEXT,
    "objectiveEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizChapterLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizUserLevelIntroSeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "stage" "QuizStage" NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizUserLevelIntroSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizChapterLevel_chapterId_stage_key" ON "QuizChapterLevel"("chapterId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "QuizUserLevelIntroSeen_userId_chapterId_stage_key" ON "QuizUserLevelIntroSeen"("userId", "chapterId", "stage");

-- AddForeignKey
ALTER TABLE "QuizChapterLevel" ADD CONSTRAINT "QuizChapterLevel_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "QuizChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizUserLevelIntroSeen" ADD CONSTRAINT "QuizUserLevelIntroSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizUserLevelIntroSeen" ADD CONSTRAINT "QuizUserLevelIntroSeen_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "QuizChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
