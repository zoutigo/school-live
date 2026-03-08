DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolCalendarEventType') THEN
    CREATE TYPE "SchoolCalendarEventType" AS ENUM ('HOLIDAY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolCalendarEventScope') THEN
    CREATE TYPE "SchoolCalendarEventScope" AS ENUM ('SCHOOL', 'ACADEMIC_LEVEL', 'CLASS');
  END IF;
END $$;

ALTER TABLE "Class"
  ADD COLUMN IF NOT EXISTS "referentTeacherUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Class_referentTeacherUserId_idx"
  ON "Class"("referentTeacherUserId");

DO $$
BEGIN
  ALTER TABLE "Class"
    ADD CONSTRAINT "Class_referentTeacherUserId_fkey"
    FOREIGN KEY ("referentTeacherUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClassTimetableSlot" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "schoolYearId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "room" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassTimetableSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassTimetableSlot_schoolId_idx"
  ON "ClassTimetableSlot"("schoolId");

CREATE INDEX IF NOT EXISTS "ClassTimetableSlot_schoolYearId_idx"
  ON "ClassTimetableSlot"("schoolYearId");

CREATE INDEX IF NOT EXISTS "ClassTimetableSlot_classId_weekday_startMinute_idx"
  ON "ClassTimetableSlot"("classId", "weekday", "startMinute");

CREATE INDEX IF NOT EXISTS "ClassTimetableSlot_teacherUserId_weekday_startMinute_idx"
  ON "ClassTimetableSlot"("teacherUserId", "weekday", "startMinute");

CREATE INDEX IF NOT EXISTS "ClassTimetableSlot_room_weekday_startMinute_idx"
  ON "ClassTimetableSlot"("room", "weekday", "startMinute");

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_schoolYearId_fkey"
    FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassTimetableSlot"
    ADD CONSTRAINT "ClassTimetableSlot_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SchoolCalendarEvent" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "schoolYearId" TEXT NOT NULL,
  "type" "SchoolCalendarEventType" NOT NULL DEFAULT 'HOLIDAY',
  "scope" "SchoolCalendarEventScope" NOT NULL,
  "label" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "academicLevelId" TEXT,
  "classId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchoolCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SchoolCalendarEvent_schoolId_idx"
  ON "SchoolCalendarEvent"("schoolId");

CREATE INDEX IF NOT EXISTS "SchoolCalendarEvent_schoolYearId_idx"
  ON "SchoolCalendarEvent"("schoolYearId");

CREATE INDEX IF NOT EXISTS "SchoolCalendarEvent_scope_classId_academicLevelId_idx"
  ON "SchoolCalendarEvent"("scope", "classId", "academicLevelId");

CREATE INDEX IF NOT EXISTS "SchoolCalendarEvent_startDate_endDate_idx"
  ON "SchoolCalendarEvent"("startDate", "endDate");

DO $$
BEGIN
  ALTER TABLE "SchoolCalendarEvent"
    ADD CONSTRAINT "SchoolCalendarEvent_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolCalendarEvent"
    ADD CONSTRAINT "SchoolCalendarEvent_schoolYearId_fkey"
    FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolCalendarEvent"
    ADD CONSTRAINT "SchoolCalendarEvent_academicLevelId_fkey"
    FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolCalendarEvent"
    ADD CONSTRAINT "SchoolCalendarEvent_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolCalendarEvent"
    ADD CONSTRAINT "SchoolCalendarEvent_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
