ALTER TABLE "ClassTimetableSlot"
  ADD COLUMN "activeFromDate" TIMESTAMP(3),
  ADD COLUMN "activeToDate" TIMESTAMP(3);

DROP INDEX IF EXISTS "ClassTimetableSlot_classId_weekday_startMinute_idx";
DROP INDEX IF EXISTS "ClassTimetableSlot_teacherUserId_weekday_startMinute_idx";
DROP INDEX IF EXISTS "ClassTimetableSlot_room_weekday_startMinute_idx";

CREATE INDEX "ClassTimetableSlot_class_weekday_start_active_range_idx"
  ON "ClassTimetableSlot"("classId", "weekday", "startMinute", "activeFromDate", "activeToDate");
CREATE INDEX "ClassTimetableSlot_teacher_weekday_start_active_range_idx"
  ON "ClassTimetableSlot"("teacherUserId", "weekday", "startMinute", "activeFromDate", "activeToDate");
CREATE INDEX "ClassTimetableSlot_room_weekday_start_active_range_idx"
  ON "ClassTimetableSlot"("room", "weekday", "startMinute", "activeFromDate", "activeToDate");
