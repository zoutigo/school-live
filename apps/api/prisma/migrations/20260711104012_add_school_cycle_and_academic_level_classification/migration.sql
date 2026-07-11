-- CreateEnum
CREATE TYPE "SchoolCycle" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "AcademicLevel" ADD COLUMN     "cycle" "SchoolCycle",
ADD COLUMN     "languageSystem" "SchoolLanguageSystem";

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "cycle" "SchoolCycle";
