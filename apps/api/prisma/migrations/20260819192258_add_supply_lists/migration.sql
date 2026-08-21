-- CreateTable
CREATE TABLE "SupplyList" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "trackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "supplyListId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplyList_schoolId_idx" ON "SupplyList"("schoolId");

-- CreateIndex
CREATE INDEX "SupplyList_schoolYearId_idx" ON "SupplyList"("schoolYearId");

-- CreateIndex
CREATE INDEX "SupplyList_academicLevelId_idx" ON "SupplyList"("academicLevelId");

-- CreateIndex
CREATE INDEX "SupplyList_trackId_idx" ON "SupplyList"("trackId");

-- CreateIndex
CREATE INDEX "SupplyItem_schoolId_idx" ON "SupplyItem"("schoolId");

-- CreateIndex
CREATE INDEX "SupplyItem_supplyListId_idx" ON "SupplyItem"("supplyListId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyItem_supplyListId_rank_key" ON "SupplyItem"("supplyListId", "rank");

-- AddForeignKey
ALTER TABLE "SupplyList" ADD CONSTRAINT "SupplyList_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyList" ADD CONSTRAINT "SupplyList_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyList" ADD CONSTRAINT "SupplyList_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyList" ADD CONSTRAINT "SupplyList_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyItem" ADD CONSTRAINT "SupplyItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyItem" ADD CONSTRAINT "SupplyItem_supplyListId_fkey" FOREIGN KEY ("supplyListId") REFERENCES "SupplyList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
