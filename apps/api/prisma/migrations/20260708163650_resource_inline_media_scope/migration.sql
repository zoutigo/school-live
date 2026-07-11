-- AlterEnum
ALTER TYPE "InlineMediaEntityType" ADD VALUE 'RESOURCE';

-- AlterEnum
ALTER TYPE "InlineMediaScope" ADD VALUE 'RESOURCE';

-- AlterTable
ALTER TABLE "InlineMediaAsset" ALTER COLUMN "schoolId" DROP NOT NULL;
