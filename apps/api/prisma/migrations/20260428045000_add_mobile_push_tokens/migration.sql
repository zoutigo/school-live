CREATE TYPE "MobilePushProvider" AS ENUM ('EXPO');

CREATE TYPE "MobilePushPlatform" AS ENUM ('IOS', 'ANDROID', 'UNKNOWN');

CREATE TABLE "MobilePushToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "schoolId" TEXT,
  "provider" "MobilePushProvider" NOT NULL DEFAULT 'EXPO',
  "platform" "MobilePushPlatform" NOT NULL DEFAULT 'UNKNOWN',
  "token" TEXT NOT NULL,
  "deviceId" TEXT,
  "deviceName" TEXT,
  "appVersion" TEXT,
  "projectId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobilePushToken_token_key" ON "MobilePushToken"("token");
CREATE INDEX "MobilePushToken_userId_idx" ON "MobilePushToken"("userId");
CREATE INDEX "MobilePushToken_schoolId_idx" ON "MobilePushToken"("schoolId");
CREATE INDEX "MobilePushToken_userId_schoolId_isActive_idx" ON "MobilePushToken"("userId", "schoolId", "isActive");

ALTER TABLE "MobilePushToken"
  ADD CONSTRAINT "MobilePushToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MobilePushToken"
  ADD CONSTRAINT "MobilePushToken_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
