-- CreateTable
CREATE TABLE "HelpFaq" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "audience" "HelpGuideAudience" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "HelpPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpFaqTheme" (
    "id" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "HelpPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpFaqTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpFaqItem" (
    "id" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "answerHtml" TEXT NOT NULL,
    "answerJson" JSONB,
    "answerText" TEXT NOT NULL DEFAULT '',
    "status" "HelpPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpFaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpFaq_schoolId_audience_slug_key" ON "HelpFaq"("schoolId", "audience", "slug");

-- CreateIndex
CREATE INDEX "HelpFaq_schoolId_audience_status_idx" ON "HelpFaq"("schoolId", "audience", "status");

-- CreateIndex
CREATE INDEX "HelpFaq_audience_status_idx" ON "HelpFaq"("audience", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HelpFaqTheme_faqId_slug_key" ON "HelpFaqTheme"("faqId", "slug");

-- CreateIndex
CREATE INDEX "HelpFaqTheme_faqId_orderIndex_idx" ON "HelpFaqTheme"("faqId", "orderIndex");

-- CreateIndex
CREATE INDEX "HelpFaqTheme_faqId_status_idx" ON "HelpFaqTheme"("faqId", "status");

-- CreateIndex
CREATE INDEX "HelpFaqItem_themeId_orderIndex_idx" ON "HelpFaqItem"("themeId", "orderIndex");

-- CreateIndex
CREATE INDEX "HelpFaqItem_themeId_status_idx" ON "HelpFaqItem"("themeId", "status");

-- AddForeignKey
ALTER TABLE "HelpFaq" ADD CONSTRAINT "HelpFaq_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaq" ADD CONSTRAINT "HelpFaq_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaq" ADD CONSTRAINT "HelpFaq_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqTheme" ADD CONSTRAINT "HelpFaqTheme_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "HelpFaq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqTheme" ADD CONSTRAINT "HelpFaqTheme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqTheme" ADD CONSTRAINT "HelpFaqTheme_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqItem" ADD CONSTRAINT "HelpFaqItem_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "HelpFaqTheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqItem" ADD CONSTRAINT "HelpFaqItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpFaqItem" ADD CONSTRAINT "HelpFaqItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
