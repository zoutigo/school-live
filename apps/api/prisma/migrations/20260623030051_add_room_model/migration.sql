-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "ClassTimetableOneOffSlot" ADD COLUMN     "roomId" TEXT;

-- AlterTable
ALTER TABLE "ClassTimetableSlot" ADD COLUMN     "roomId" TEXT;

-- AlterTable
ALTER TABLE "ClassTimetableSlotException" ADD COLUMN     "roomId" TEXT;

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "maxConcurrentSlots" INTEGER NOT NULL DEFAULT 1,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Room_schoolId_idx" ON "Room"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_schoolId_name_key" ON "Room"("schoolId", "name");

-- CreateIndex
CREATE INDEX "ClassTimetableOneOffSlot_roomId_occurrenceDate_startMinute_idx" ON "ClassTimetableOneOffSlot"("roomId", "occurrenceDate", "startMinute");

-- CreateIndex
CREATE INDEX "ClassTimetableSlot_roomId_weekday_startMinute_activeFromDat_idx" ON "ClassTimetableSlot"("roomId", "weekday", "startMinute", "activeFromDate", "activeToDate");

-- CreateIndex
CREATE INDEX "ClassTimetableSlotException_roomId_occurrenceDate_startMinu_idx" ON "ClassTimetableSlotException"("roomId", "occurrenceDate", "startMinute");

-- AddForeignKey
ALTER TABLE "ClassTimetableSlot" ADD CONSTRAINT "ClassTimetableSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableOneOffSlot" ADD CONSTRAINT "ClassTimetableOneOffSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTimetableSlotException" ADD CONSTRAINT "ClassTimetableSlotException_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
