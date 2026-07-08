-- CreateEnum
CREATE TYPE "SchoolLanguageSystem" AS ENUM ('FRANCOPHONE', 'ANGLOPHONE', 'BILINGUAL');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('GENERAL', 'TECHNICAL');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "languageSystem" "SchoolLanguageSystem",
ADD COLUMN     "ownership" TEXT,
ADD COLUMN     "schoolType" "SchoolType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeSchoolId" TEXT;

-- CreateIndex
CREATE INDEX "User_activeSchoolId_idx" ON "User"("activeSchoolId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeSchoolId_fkey" FOREIGN KEY ("activeSchoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
