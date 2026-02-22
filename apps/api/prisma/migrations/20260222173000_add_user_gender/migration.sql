-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gender" "Gender";
