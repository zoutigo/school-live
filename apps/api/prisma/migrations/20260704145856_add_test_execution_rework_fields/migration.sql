-- AlterTable
ALTER TABLE "TestExecution" ADD COLUMN     "reworkNote" TEXT,
ADD COLUMN     "reworkRequestedAt" TIMESTAMP(3),
ADD COLUMN     "reworkRequestedById" TEXT;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_reworkRequestedById_fkey" FOREIGN KEY ("reworkRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
