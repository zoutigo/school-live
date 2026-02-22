-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedPostType') THEN
    CREATE TYPE "FeedPostType" AS ENUM ('POST', 'POLL');
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedAudienceScope') THEN
    CREATE TYPE "FeedAudienceScope" AS ENUM ('SCHOOL_ALL', 'STAFF_ONLY', 'PARENTS_STUDENTS', 'PARENTS_ONLY', 'LEVEL', 'CLASS');
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedPost" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "type" "FeedPostType" NOT NULL DEFAULT 'POST',
    "title" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "audienceScope" "FeedAudienceScope" NOT NULL,
    "audienceLabel" TEXT NOT NULL,
    "audienceLevelId" TEXT,
    "audienceClassId" TEXT,
    "featuredUntil" TIMESTAMP(3),
    "pollQuestion" TEXT,
    "pollOptionsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedPostAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "sizeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPostAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FeedLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FeedPost_schoolId_createdAt_idx" ON "FeedPost"("schoolId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedPost_authorUserId_idx" ON "FeedPost"("authorUserId");
CREATE INDEX IF NOT EXISTS "FeedPost_audienceScope_idx" ON "FeedPost"("audienceScope");
CREATE INDEX IF NOT EXISTS "FeedPost_audienceLevelId_idx" ON "FeedPost"("audienceLevelId");
CREATE INDEX IF NOT EXISTS "FeedPost_audienceClassId_idx" ON "FeedPost"("audienceClassId");

CREATE INDEX IF NOT EXISTS "FeedPostAttachment_postId_idx" ON "FeedPostAttachment"("postId");

CREATE INDEX IF NOT EXISTS "FeedComment_postId_createdAt_idx" ON "FeedComment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedComment_schoolId_idx" ON "FeedComment"("schoolId");
CREATE INDEX IF NOT EXISTS "FeedComment_authorUserId_idx" ON "FeedComment"("authorUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "FeedLike_postId_userId_key" ON "FeedLike"("postId", "userId");
CREATE INDEX IF NOT EXISTS "FeedLike_schoolId_idx" ON "FeedLike"("schoolId");
CREATE INDEX IF NOT EXISTS "FeedLike_userId_idx" ON "FeedLike"("userId");

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_audienceLevelId_fkey" FOREIGN KEY ("audienceLevelId") REFERENCES "AcademicLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_audienceClassId_fkey" FOREIGN KEY ("audienceClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "FeedPostAttachment" ADD CONSTRAINT "FeedPostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "FeedLike" ADD CONSTRAINT "FeedLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedLike" ADD CONSTRAINT "FeedLike_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
ALTER TABLE "FeedLike" ADD CONSTRAINT "FeedLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
