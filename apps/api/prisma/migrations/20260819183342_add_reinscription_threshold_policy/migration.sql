-- CreateEnum
CREATE TYPE "ReinscriptionThresholdPolicy" AS ENUM ('FIRST_INSTALLMENT', 'FULL_PAYMENT');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "reinscriptionThresholdPolicy" "ReinscriptionThresholdPolicy" NOT NULL DEFAULT 'FIRST_INSTALLMENT';
