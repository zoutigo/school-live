-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('ADD_EMAIL', 'CHANGE_EMAIL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthAuditEvent" ADD VALUE 'CHANGE_EMAIL';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'LINK_SSO';

-- AlterTable
ALTER TABLE "EmailVerificationToken" ADD COLUMN     "purpose" "EmailVerificationPurpose" NOT NULL DEFAULT 'ADD_EMAIL';
