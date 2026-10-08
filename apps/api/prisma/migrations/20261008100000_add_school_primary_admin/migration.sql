-- AlterTable
ALTER TABLE "School" ADD COLUMN "primaryAdminUserId" TEXT;

-- CreateIndex
CREATE INDEX "School_primaryAdminUserId_idx" ON "School"("primaryAdminUserId");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_primaryAdminUserId_fkey" FOREIGN KEY ("primaryAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
