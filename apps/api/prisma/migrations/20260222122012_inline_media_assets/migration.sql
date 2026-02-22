-- CreateEnum
CREATE TYPE "InlineMediaScope" AS ENUM ('FEED', 'MESSAGING');

-- CreateEnum
CREATE TYPE "InlineMediaStatus" AS ENUM ('TEMP', 'LINKED');

-- CreateEnum
CREATE TYPE "InlineMediaEntityType" AS ENUM ('FEED_POST', 'INTERNAL_MESSAGE');

-- CreateTable
CREATE TABLE "InlineMediaAsset" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "scope" "InlineMediaScope" NOT NULL,
    "status" "InlineMediaStatus" NOT NULL DEFAULT 'TEMP',
    "url" TEXT NOT NULL,
    "entityType" "InlineMediaEntityType",
    "entityId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InlineMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InlineMediaAsset_url_key" ON "InlineMediaAsset"("url");

-- CreateIndex
CREATE INDEX "InlineMediaAsset_status_expiresAt_idx" ON "InlineMediaAsset"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "InlineMediaAsset_entityType_entityId_idx" ON "InlineMediaAsset"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InlineMediaAsset_schoolId_scope_status_idx" ON "InlineMediaAsset"("schoolId", "scope", "status");
