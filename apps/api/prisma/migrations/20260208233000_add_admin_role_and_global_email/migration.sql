-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropIndex
DROP INDEX "User_schoolId_email_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

