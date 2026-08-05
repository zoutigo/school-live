-- CreateEnum
CREATE TYPE "EnrollmentConfirmationSource" AS ENUM ('MANUAL', 'PAYMENT_THRESHOLD');

-- CreateEnum
CREATE TYPE "PromotionDecision" AS ENUM ('PROMOTED', 'REPEATED', 'LEFT');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'ALLOCATION');

-- CreateEnum
CREATE TYPE "StudentPaymentSource" AS ENUM ('DIRECT_CASH', 'WALLET_ALLOCATION');

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classId_fkey";

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "academicLevelId" TEXT,
ADD COLUMN     "confirmationSource" "EnrollmentConfirmationSource",
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedByUserId" TEXT,
ADD COLUMN     "trackId" TEXT,
ALTER COLUMN "classId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StudentTermReport" ADD COLUMN     "decision" "PromotionDecision",
ADD COLUMN     "nextAcademicLevelId" TEXT,
ADD COLUMN     "nextTrackId" TEXT;

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "feeScheduleId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "studentId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" "StudentPaymentSource" NOT NULL,
    "walletTransactionId" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeSchedule_schoolId_idx" ON "FeeSchedule"("schoolId");

-- CreateIndex
CREATE INDEX "FeeSchedule_schoolYearId_idx" ON "FeeSchedule"("schoolYearId");

-- CreateIndex
CREATE INDEX "FeeSchedule_academicLevelId_idx" ON "FeeSchedule"("academicLevelId");

-- CreateIndex
CREATE INDEX "FeeSchedule_trackId_idx" ON "FeeSchedule"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeSchedule_schoolYearId_academicLevelId_trackId_key" ON "FeeSchedule"("schoolYearId", "academicLevelId", "trackId");

-- CreateIndex
CREATE INDEX "FeeInstallment_schoolId_idx" ON "FeeInstallment"("schoolId");

-- CreateIndex
CREATE INDEX "FeeInstallment_feeScheduleId_idx" ON "FeeInstallment"("feeScheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "FeeInstallment_feeScheduleId_rank_key" ON "FeeInstallment"("feeScheduleId", "rank");

-- CreateIndex
CREATE INDEX "Wallet_schoolId_idx" ON "Wallet"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_schoolId_parentUserId_key" ON "Wallet"("schoolId", "parentUserId");

-- CreateIndex
CREATE INDEX "WalletTransaction_schoolId_idx" ON "WalletTransaction"("schoolId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_studentId_idx" ON "WalletTransaction"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_walletTransactionId_key" ON "StudentPayment"("walletTransactionId");

-- CreateIndex
CREATE INDEX "StudentPayment_schoolId_idx" ON "StudentPayment"("schoolId");

-- CreateIndex
CREATE INDEX "StudentPayment_schoolYearId_idx" ON "StudentPayment"("schoolYearId");

-- CreateIndex
CREATE INDEX "StudentPayment_studentId_schoolYearId_idx" ON "StudentPayment"("studentId", "schoolYearId");

-- CreateIndex
CREATE INDEX "Enrollment_academicLevelId_idx" ON "Enrollment"("academicLevelId");

-- CreateIndex
CREATE INDEX "Enrollment_trackId_idx" ON "Enrollment"("trackId");

-- CreateIndex
CREATE INDEX "Enrollment_confirmedByUserId_idx" ON "Enrollment"("confirmedByUserId");

-- CreateIndex
CREATE INDEX "StudentTermReport_nextAcademicLevelId_idx" ON "StudentTermReport"("nextAcademicLevelId");

-- CreateIndex
CREATE INDEX "StudentTermReport_nextTrackId_idx" ON "StudentTermReport"("nextTrackId");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_nextAcademicLevelId_fkey" FOREIGN KEY ("nextAcademicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermReport" ADD CONSTRAINT "StudentTermReport_nextTrackId_fkey" FOREIGN KEY ("nextTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeSchedule" ADD CONSTRAINT "FeeSchedule_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feeScheduleId_fkey" FOREIGN KEY ("feeScheduleId") REFERENCES "FeeSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
