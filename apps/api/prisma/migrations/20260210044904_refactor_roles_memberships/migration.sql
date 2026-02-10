/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schoolId,userId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,userId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT');

-- CreateEnum
CREATE TYPE "SchoolRole" AS ENUM ('SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'SCHOOL_ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropIndex
DROP INDEX "Student_userId_key";

-- DropIndex
DROP INDEX "Teacher_userId_key";

-- DropIndex
DROP INDEX "User_schoolId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "schoolId";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "PlatformRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "role" "SchoolRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformRoleAssignment_role_idx" ON "PlatformRoleAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRoleAssignment_userId_role_key" ON "PlatformRoleAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "SchoolMembership_schoolId_idx" ON "SchoolMembership"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolMembership_role_idx" ON "SchoolMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolMembership_userId_schoolId_role_key" ON "SchoolMembership"("userId", "schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_userId_key" ON "Student"("schoolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_userId_key" ON "Teacher"("schoolId", "userId");

-- AddForeignKey
ALTER TABLE "PlatformRoleAssignment" ADD CONSTRAINT "PlatformRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolMembership" ADD CONSTRAINT "SchoolMembership_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
