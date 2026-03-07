-- CreateEnum
CREATE TYPE "AuthRateLimitPurpose" AS ENUM ('PASSWORD_LOGIN', 'PHONE_LOGIN', 'SSO_LOGIN', 'ACTIVATION');

-- CreateEnum
CREATE TYPE "AuthAuditEvent" AS ENUM ('LOGIN_PASSWORD', 'LOGIN_PHONE', 'LOGIN_SSO', 'ACTIVATION_COMPLETE', 'CHANGE_PASSWORD', 'CHANGE_PIN');

-- CreateEnum
CREATE TYPE "AuthAuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'BLOCKED');

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "id" TEXT NOT NULL,
    "purpose" "AuthRateLimitPurpose" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "schoolId" TEXT,
    "event" "AuthAuditEvent" NOT NULL,
    "status" "AuthAuditStatus" NOT NULL,
    "provider" "AuthProvider",
    "principal" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reasonCode" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthRateLimit_purpose_keyHash_key" ON "AuthRateLimit"("purpose", "keyHash");
CREATE INDEX "AuthRateLimit_blockedUntil_idx" ON "AuthRateLimit"("blockedUntil");

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_idx" ON "AuthAuditLog"("userId");
CREATE INDEX "AuthAuditLog_schoolId_idx" ON "AuthAuditLog"("schoolId");
CREATE INDEX "AuthAuditLog_event_status_createdAt_idx" ON "AuthAuditLog"("event", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthAuditLog"
ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuthAuditLog"
ADD CONSTRAINT "AuthAuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
