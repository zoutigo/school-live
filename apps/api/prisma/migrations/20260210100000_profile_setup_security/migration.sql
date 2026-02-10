-- CreateEnum
CREATE TYPE "RecoveryQuestionKey" AS ENUM ('MOTHER_MAIDEN_NAME', 'FAVORITE_SPORT', 'FAVORITE_TEACHER', 'BIRTH_CITY', 'CHILDHOOD_NICKNAME', 'FAVORITE_BOOK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recoveryBirthDate" TIMESTAMP(3),
ADD COLUMN     "recoveryClassId" TEXT,
ADD COLUMN     "recoveryStudentId" TEXT;

-- CreateTable
CREATE TABLE "UserRecoveryAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionKey" "RecoveryQuestionKey" NOT NULL,
    "answerHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRecoveryAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRecoveryAnswer_userId_idx" ON "UserRecoveryAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecoveryAnswer_userId_questionKey_key" ON "UserRecoveryAnswer"("userId", "questionKey");

-- AddForeignKey
ALTER TABLE "UserRecoveryAnswer" ADD CONSTRAINT "UserRecoveryAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

