-- CreateTable
CREATE TABLE "SupplyListView" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyListView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplyListView_schoolId_idx" ON "SupplyListView"("schoolId");

-- CreateIndex
CREATE INDEX "SupplyListView_studentId_schoolYearId_idx" ON "SupplyListView"("studentId", "schoolYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyListView_parentUserId_studentId_schoolYearId_key" ON "SupplyListView"("parentUserId", "studentId", "schoolYearId");

-- AddForeignKey
ALTER TABLE "SupplyListView" ADD CONSTRAINT "SupplyListView_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyListView" ADD CONSTRAINT "SupplyListView_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyListView" ADD CONSTRAINT "SupplyListView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyListView" ADD CONSTRAINT "SupplyListView_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
