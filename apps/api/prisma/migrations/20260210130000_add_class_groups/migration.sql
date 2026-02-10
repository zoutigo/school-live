-- DropIndex
DROP INDEX "Class_schoolId_name_year_key";

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "classGroupId" TEXT;

-- CreateTable
CREATE TABLE "ClassGroup" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassGroup_schoolId_idx" ON "ClassGroup"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_schoolId_name_key" ON "ClassGroup"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Class_classGroupId_idx" ON "Class"("classGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_classGroupId_name_year_key" ON "Class"("schoolId", "classGroupId", "name", "year");

-- AddForeignKey
ALTER TABLE "ClassGroup" ADD CONSTRAINT "ClassGroup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

