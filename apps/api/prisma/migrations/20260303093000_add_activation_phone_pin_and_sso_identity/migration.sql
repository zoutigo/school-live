-- CreateEnum
CREATE TYPE "AccountActivationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "activationStatus" "AccountActivationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "phoneConfirmedAt" TIMESTAMP(3);

-- Backfill existing accounts to keep current behavior unchanged.
UPDATE "User" SET "activationStatus" = 'ACTIVE';

-- CreateTable
CREATE TABLE "UserAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoneCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPhoneCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthIdentity_provider_providerAccountId_key" ON "UserAuthIdentity"("provider", "providerAccountId");
CREATE INDEX "UserAuthIdentity_userId_idx" ON "UserAuthIdentity"("userId");
CREATE INDEX "UserAuthIdentity_email_idx" ON "UserAuthIdentity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhoneCredential_userId_key" ON "UserPhoneCredential"("userId");
CREATE UNIQUE INDEX "UserPhoneCredential_phoneE164_key" ON "UserPhoneCredential"("phoneE164");
CREATE INDEX "UserPhoneCredential_phoneE164_idx" ON "UserPhoneCredential"("phoneE164");

-- CreateIndex
CREATE INDEX "ActivationCode_userId_idx" ON "ActivationCode"("userId");
CREATE INDEX "ActivationCode_schoolId_idx" ON "ActivationCode"("schoolId");
CREATE INDEX "ActivationCode_expiresAt_idx" ON "ActivationCode"("expiresAt");
CREATE INDEX "ActivationCode_usedAt_idx" ON "ActivationCode"("usedAt");

-- AddForeignKey
ALTER TABLE "UserAuthIdentity"
ADD CONSTRAINT "UserAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPhoneCredential"
ADD CONSTRAINT "UserPhoneCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationCode"
ADD CONSTRAINT "ActivationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationCode"
ADD CONSTRAINT "ActivationCode_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivationCode"
ADD CONSTRAINT "ActivationCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
