-- CreateEnum
CREATE TYPE "BadgeScope" AS ENUM ('NOTES', 'FEED', 'TICKETS', 'DISCIPLINE');

-- CreateTable
CREATE TABLE "UserReadMarker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "BadgeScope" NOT NULL,
    "scopeRefId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReadMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReadMarker_userId_idx" ON "UserReadMarker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReadMarker_userId_scope_scopeRefId_key" ON "UserReadMarker"("userId", "scope", "scopeRefId");

-- AddForeignKey
ALTER TABLE "UserReadMarker" ADD CONSTRAINT "UserReadMarker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
