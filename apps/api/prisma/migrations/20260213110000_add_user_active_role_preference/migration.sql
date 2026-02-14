-- CreateEnum
CREATE TYPE "AppRole" AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'SALES',
  'SUPPORT',
  'SCHOOL_ADMIN',
  'SCHOOL_MANAGER',
  'SCHOOL_ACCOUNTANT',
  'TEACHER',
  'PARENT',
  'STUDENT'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "activeRole" "AppRole";
