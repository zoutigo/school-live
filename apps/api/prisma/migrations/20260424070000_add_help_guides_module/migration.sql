-- CreateEnum
CREATE TYPE "HelpGuideAudience" AS ENUM ('PARENT', 'TEACHER', 'STUDENT', 'SCHOOL_ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "HelpPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HelpChapterContentType" AS ENUM ('RICH_TEXT', 'VIDEO');

-- CreateTable
CREATE TABLE "HelpGuide" (
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

    CONSTRAINT "HelpGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpChapter" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "parentId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "contentType" "HelpChapterContentType" NOT NULL DEFAULT 'RICH_TEXT',
    "contentHtml" TEXT,
    "contentJson" JSONB,
    "videoUrl" TEXT,
    "contentText" TEXT NOT NULL DEFAULT '',
    "status" "HelpPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HelpGuide_schoolId_audience_slug_key" ON "HelpGuide"("schoolId", "audience", "slug");

-- CreateIndex
CREATE INDEX "HelpGuide_schoolId_audience_status_idx" ON "HelpGuide"("schoolId", "audience", "status");

-- CreateIndex
CREATE INDEX "HelpGuide_audience_status_idx" ON "HelpGuide"("audience", "status");

-- CreateIndex
CREATE UNIQUE INDEX "HelpChapter_guideId_slug_key" ON "HelpChapter"("guideId", "slug");

-- CreateIndex
CREATE INDEX "HelpChapter_guideId_parentId_orderIndex_idx" ON "HelpChapter"("guideId", "parentId", "orderIndex");

-- CreateIndex
CREATE INDEX "HelpChapter_guideId_status_idx" ON "HelpChapter"("guideId", "status");

-- CreateIndex
CREATE INDEX "HelpChapter_contentType_idx" ON "HelpChapter"("contentType");

-- AddForeignKey
ALTER TABLE "HelpGuide" ADD CONSTRAINT "HelpGuide_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpGuide" ADD CONSTRAINT "HelpGuide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpGuide" ADD CONSTRAINT "HelpGuide_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpChapter" ADD CONSTRAINT "HelpChapter_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "HelpGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpChapter" ADD CONSTRAINT "HelpChapter_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HelpChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpChapter" ADD CONSTRAINT "HelpChapter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpChapter" ADD CONSTRAINT "HelpChapter_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
