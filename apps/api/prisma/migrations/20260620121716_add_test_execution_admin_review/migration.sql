-- AlterTable
ALTER TABLE "TestExecution" ADD COLUMN     "adminReviewNote" TEXT,
ADD COLUMN     "adminReviewedAt" TIMESTAMP(3),
ADD COLUMN     "adminReviewedById" TEXT;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
