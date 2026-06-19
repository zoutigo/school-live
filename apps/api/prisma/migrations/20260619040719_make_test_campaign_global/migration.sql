-- DropForeignKey
ALTER TABLE "TestCampaign" DROP CONSTRAINT "TestCampaign_schoolId_fkey";

-- DropIndex
DROP INDEX "TestCampaign_schoolId_createdAt_idx";

-- DropIndex
DROP INDEX "TestCampaign_schoolId_status_dueAt_idx";

-- AlterTable
ALTER TABLE "TestCampaign" ADD COLUMN     "reference" SERIAL NOT NULL,
ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "recycledAt" TIMESTAMP(3),
ADD COLUMN     "reference" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "TestCampaignAssignment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCampaignAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCampaignAssignment_userId_idx" ON "TestCampaignAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCampaignAssignment_campaignId_userId_key" ON "TestCampaignAssignment"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCampaign_reference_key" ON "TestCampaign"("reference");

-- CreateIndex
CREATE INDEX "TestCampaign_status_dueAt_idx" ON "TestCampaign"("status", "dueAt");

-- CreateIndex
CREATE INDEX "TestCampaign_createdAt_idx" ON "TestCampaign"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_reference_key" ON "TestCase"("reference");

-- AddForeignKey
ALTER TABLE "TestCampaign" ADD CONSTRAINT "TestCampaign_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCampaignAssignment" ADD CONSTRAINT "TestCampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TestCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCampaignAssignment" ADD CONSTRAINT "TestCampaignAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCampaignAssignment" ADD CONSTRAINT "TestCampaignAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

