-- CreateEnum
CREATE TYPE "TimetableOccurrenceExceptionType" AS ENUM ('OVERRIDE', 'CANCEL');

-- CreateEnum
CREATE TYPE "TimetableOccurrenceStatus" AS ENUM ('PLANNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ClassTimetableOneOffSlot" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "room" TEXT,
    "status" "TimetableOccurrenceStatus" NOT NULL DEFAULT 'PLANNED',
    "sourceSlotId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTimetableOneOffSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTimetableSlotException" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolYearId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "occurrenceDate" TIMESTAMP(3) NOT NULL,
    "type" "TimetableOccurrenceExceptionType" NOT NULL,
    "subjectId" TEXT,
    "teacherUserId" TEXT,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "room" TEXT,
    "reason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTimetableSlotException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_schoolId_idx" ON "ClassTimetableOneOffSlot"("schoolId");

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_schoolYearId_idx" ON "ClassTimetableOneOffSlot"("schoolYearId");

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_classId_occurrenceDate_startMinute_idx" ON "ClassTimetableOneOffSlot"("classId", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_teacherUserId_occurrenceDate_start_idx" ON "ClassTimetableOneOffSlot"("teacherUserId", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_room_occurrenceDate_startMinute_idx" ON "ClassTimetableOneOffSlot"("room", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_schoolId_idx" ON "ClassTimetableSlotException"("schoolId");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_schoolYearId_idx" ON "ClassTimetableSlotException"("schoolYearId");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_classId_occurrenceDate_idx" ON "ClassTimetableSlotException"("classId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_teacherUserId_occurrenceDate_st_idx" ON "ClassTimetableSlotException"("teacherUserId", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_room_occurrenceDate_startMinute_idx" ON "ClassTimetableSlotException"("room", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTimetableSlotException_slotId_occurrenceDate_key" ON "ClassTimetableSlotException"("slotId", "occurrenceDate");

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_sourceSlotId_fkey" FOREIGN KEY ("sourceSlotId") REFERENCES "ClassTimetableSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_schoolYearId_fkey" FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ClassTimetableSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ClassTimetableSubjectStyle_schoolId_schoolYearId_classId_subjec" RENAME TO "ClassTimetableSubjectStyle_schoolId_schoolYearId_classId_su_key";

