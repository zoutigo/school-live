-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrollmentStatus') THEN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OverrideAction') THEN
    CREATE TYPE "OverrideAction" AS ENUM ('ADD', 'REMOVE');
  END IF;
END $$;

-- 2) SchoolYear + School active pointer
CREATE TABLE IF NOT EXISTS "SchoolYear" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolYear_schoolId_label_key" ON "SchoolYear"("schoolId", "label");
CREATE INDEX IF NOT EXISTS "SchoolYear_schoolId_idx" ON "SchoolYear"("schoolId");

ALTER TABLE "SchoolYear"
  ADD CONSTRAINT "SchoolYear_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "activeSchoolYearId" TEXT;
CREATE INDEX IF NOT EXISTS "School_activeSchoolYearId_idx" ON "School"("activeSchoolYearId");

-- Backfill SchoolYear from legacy Class.year
INSERT INTO "SchoolYear" ("id", "schoolId", "label", "createdAt", "updatedAt")
SELECT
  'sy_' || md5("schoolId" || '|' || "year"),
  "schoolId",
  "year",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Class"
GROUP BY "schoolId", "year"
ON CONFLICT ("schoolId", "label") DO NOTHING;

-- Ensure at least one SchoolYear per school
INSERT INTO "SchoolYear" ("id", "schoolId", "label", "createdAt", "updatedAt")
SELECT
  'sy_' || md5(s."id" || '|default'),
  s."id",
  (CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 8
      THEN EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || (EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1)::TEXT
    ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1)::TEXT || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT
  END),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "School" s
WHERE NOT EXISTS (
  SELECT 1
  FROM "SchoolYear" sy
  WHERE sy."schoolId" = s."id"
)
ON CONFLICT ("schoolId", "label") DO NOTHING;

-- Set active year to latest label per school if missing
UPDATE "School" s
SET "activeSchoolYearId" = latest."id"
FROM (
  SELECT DISTINCT ON ("schoolId") "schoolId", "id"
  FROM "SchoolYear"
  ORDER BY "schoolId", "label" DESC
) latest
WHERE s."id" = latest."schoolId" AND s."activeSchoolYearId" IS NULL;

ALTER TABLE "School"
  ADD CONSTRAINT "School_activeSchoolYearId_fkey"
  FOREIGN KEY ("activeSchoolYearId") REFERENCES "SchoolYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Curriculum structure
CREATE TABLE IF NOT EXISTS "AcademicLevel" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicLevel_schoolId_code_key" ON "AcademicLevel"("schoolId", "code");
CREATE INDEX IF NOT EXISTS "AcademicLevel_schoolId_idx" ON "AcademicLevel"("schoolId");

ALTER TABLE "AcademicLevel"
  ADD CONSTRAINT "AcademicLevel_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Track" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Track_schoolId_code_key" ON "Track"("schoolId", "code");
CREATE INDEX IF NOT EXISTS "Track_schoolId_idx" ON "Track"("schoolId");

ALTER TABLE "Track"
  ADD CONSTRAINT "Track_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Curriculum" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "academicLevelId" TEXT NOT NULL,
  "trackId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Curriculum_schoolId_name_key" ON "Curriculum"("schoolId", "name");
CREATE INDEX IF NOT EXISTS "Curriculum_schoolId_idx" ON "Curriculum"("schoolId");
CREATE INDEX IF NOT EXISTS "Curriculum_academicLevelId_idx" ON "Curriculum"("academicLevelId");
CREATE INDEX IF NOT EXISTS "Curriculum_trackId_idx" ON "Curriculum"("trackId");

ALTER TABLE "Curriculum"
  ADD CONSTRAINT "Curriculum_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Curriculum"
  ADD CONSTRAINT "Curriculum_academicLevelId_fkey"
  FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Curriculum"
  ADD CONSTRAINT "Curriculum_trackId_fkey"
  FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CurriculumSubject" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "curriculumId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "coefficient" DOUBLE PRECISION,
  "weeklyHours" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumSubject_curriculumId_subjectId_key" ON "CurriculumSubject"("curriculumId", "subjectId");
CREATE INDEX IF NOT EXISTS "CurriculumSubject_schoolId_idx" ON "CurriculumSubject"("schoolId");
CREATE INDEX IF NOT EXISTS "CurriculumSubject_subjectId_idx" ON "CurriculumSubject"("subjectId");

ALTER TABLE "CurriculumSubject"
  ADD CONSTRAINT "CurriculumSubject_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSubject"
  ADD CONSTRAINT "CurriculumSubject_curriculumId_fkey"
  FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSubject"
  ADD CONSTRAINT "CurriculumSubject_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3b) ClassSubjectOverride
CREATE TABLE IF NOT EXISTS "ClassSubjectOverride" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "action" "OverrideAction" NOT NULL,
  "coefficientOverride" DOUBLE PRECISION,
  "weeklyHoursOverride" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassSubjectOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassSubjectOverride_classId_subjectId_key"
  ON "ClassSubjectOverride"("classId", "subjectId");
CREATE INDEX IF NOT EXISTS "ClassSubjectOverride_schoolId_idx" ON "ClassSubjectOverride"("schoolId");
CREATE INDEX IF NOT EXISTS "ClassSubjectOverride_classId_idx" ON "ClassSubjectOverride"("classId");
CREATE INDEX IF NOT EXISTS "ClassSubjectOverride_subjectId_idx" ON "ClassSubjectOverride"("subjectId");

ALTER TABLE "ClassSubjectOverride"
  ADD CONSTRAINT "ClassSubjectOverride_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSubjectOverride"
  ADD CONSTRAINT "ClassSubjectOverride_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSubjectOverride"
  ADD CONSTRAINT "ClassSubjectOverride_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Class migration
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "academicLevelId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "trackId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "curriculumId" TEXT;

UPDATE "Class" c
SET "schoolYearId" = sy."id"
FROM "SchoolYear" sy
WHERE sy."schoolId" = c."schoolId"
  AND sy."label" = c."year"
  AND c."schoolYearId" IS NULL;

UPDATE "Class" c
SET "schoolYearId" = s."activeSchoolYearId"
FROM "School" s
WHERE c."schoolId" = s."id"
  AND c."schoolYearId" IS NULL;

ALTER TABLE "Class" ALTER COLUMN "schoolYearId" SET NOT NULL;

DROP INDEX IF EXISTS "Class_schoolId_name_year_key";
DROP INDEX IF EXISTS "Class_schoolId_classGroupId_name_year_key";
CREATE UNIQUE INDEX "Class_schoolId_schoolYearId_classGroupId_name_key" ON "Class"("schoolId", "schoolYearId", "classGroupId", "name");
CREATE INDEX IF NOT EXISTS "Class_schoolYearId_idx" ON "Class"("schoolYearId");
CREATE INDEX IF NOT EXISTS "Class_academicLevelId_idx" ON "Class"("academicLevelId");
CREATE INDEX IF NOT EXISTS "Class_trackId_idx" ON "Class"("trackId");
CREATE INDEX IF NOT EXISTS "Class_curriculumId_idx" ON "Class"("curriculumId");

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Class"
  ADD CONSTRAINT "Class_academicLevelId_fkey"
  FOREIGN KEY ("academicLevelId") REFERENCES "AcademicLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Class"
  ADD CONSTRAINT "Class_trackId_fkey"
  FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Class"
  ADD CONSTRAINT "Class_curriculumId_fkey"
  FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Class" DROP COLUMN IF EXISTS "year";

-- 5) Enrollment + backfill from legacy Student.classId
CREATE TABLE IF NOT EXISTS "Enrollment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "schoolYearId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_schoolYearId_studentId_key" ON "Enrollment"("schoolYearId", "studentId");
CREATE INDEX IF NOT EXISTS "Enrollment_schoolId_idx" ON "Enrollment"("schoolId");
CREATE INDEX IF NOT EXISTS "Enrollment_schoolYearId_idx" ON "Enrollment"("schoolYearId");
CREATE INDEX IF NOT EXISTS "Enrollment_classId_idx" ON "Enrollment"("classId");
CREATE INDEX IF NOT EXISTS "Enrollment_studentId_idx" ON "Enrollment"("studentId");

ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment"
  ADD CONSTRAINT "Enrollment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Enrollment" ("id", "schoolId", "schoolYearId", "studentId", "classId", "status", "createdAt", "updatedAt")
SELECT
  'en_' || md5(s."id" || '|' || c."schoolYearId"),
  s."schoolId",
  c."schoolYearId",
  s."id",
  c."id",
  'ACTIVE'::"EnrollmentStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Student" s
JOIN "Class" c ON c."id" = s."classId"
WHERE s."classId" IS NOT NULL
ON CONFLICT ("schoolYearId", "studentId") DO NOTHING;

-- 5b) Drop legacy Student.classId after enrollment backfill
ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_classId_fkey";
DROP INDEX IF EXISTS "Student_classId_idx";
ALTER TABLE "Student" DROP COLUMN IF EXISTS "classId";

-- 6) Teacher assignments by school year
ALTER TABLE "TeacherClassSubject" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;

UPDATE "TeacherClassSubject" tcs
SET "schoolYearId" = c."schoolYearId"
FROM "Class" c
WHERE c."id" = tcs."classId"
  AND tcs."schoolYearId" IS NULL;

ALTER TABLE "TeacherClassSubject" ALTER COLUMN "schoolYearId" SET NOT NULL;
DROP INDEX IF EXISTS "TeacherClassSubject_teacherUserId_classId_subjectId_key";
CREATE UNIQUE INDEX "TeacherClassSubject_schoolYearId_teacherUserId_classId_subjectId_key"
  ON "TeacherClassSubject"("schoolYearId", "teacherUserId", "classId", "subjectId");
CREATE INDEX IF NOT EXISTS "TeacherClassSubject_schoolYearId_idx" ON "TeacherClassSubject"("schoolYearId");

ALTER TABLE "TeacherClassSubject"
  ADD CONSTRAINT "TeacherClassSubject_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7) Grades by school year
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "schoolYearId" TEXT;

UPDATE "Grade" g
SET "schoolYearId" = c."schoolYearId"
FROM "Class" c
WHERE c."id" = g."classId"
  AND g."schoolYearId" IS NULL;

ALTER TABLE "Grade" ALTER COLUMN "schoolYearId" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "Grade_schoolYearId_idx" ON "Grade"("schoolYearId");

ALTER TABLE "Grade"
  ADD CONSTRAINT "Grade_schoolYearId_fkey"
  FOREIGN KEY ("schoolYearId") REFERENCES "SchoolYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8) Cross-tenant and school-year integrity hardening
CREATE UNIQUE INDEX IF NOT EXISTS "Class_id_schoolYearId_key" ON "Class"("id", "schoolYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "Class_id_schoolId_key" ON "Class"("id", "schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_id_schoolId_key" ON "Student"("id", "schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subject_id_schoolId_key" ON "Subject"("id", "schoolId");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolYear_id_schoolId_key" ON "SchoolYear"("id", "schoolId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Enrollment" e
    JOIN "Class" c ON c."id" = e."classId"
    JOIN "Student" s ON s."id" = e."studentId"
    WHERE e."schoolYearId" <> c."schoolYearId"
       OR e."schoolId" <> c."schoolId"
       OR e."schoolId" <> s."schoolId"
  ) THEN
    RAISE EXCEPTION 'Enrollment integrity check failed: school/schoolYear mismatch with Class or Student';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "TeacherClassSubject" t
    JOIN "Class" c ON c."id" = t."classId"
    JOIN "Subject" s ON s."id" = t."subjectId"
    JOIN "SchoolYear" sy ON sy."id" = t."schoolYearId"
    WHERE t."schoolYearId" <> c."schoolYearId"
       OR t."schoolId" <> c."schoolId"
       OR t."schoolId" <> s."schoolId"
       OR t."schoolId" <> sy."schoolId"
  ) THEN
    RAISE EXCEPTION 'TeacherClassSubject integrity check failed: school/schoolYear mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Grade" g
    JOIN "Class" c ON c."id" = g."classId"
    JOIN "Student" st ON st."id" = g."studentId"
    JOIN "Subject" sb ON sb."id" = g."subjectId"
    JOIN "SchoolYear" sy ON sy."id" = g."schoolYearId"
    WHERE g."schoolYearId" <> c."schoolYearId"
       OR g."schoolId" <> c."schoolId"
       OR g."schoolId" <> st."schoolId"
       OR g."schoolId" <> sb."schoolId"
       OR g."schoolId" <> sy."schoolId"
  ) THEN
    RAISE EXCEPTION 'Grade integrity check failed: school/schoolYear mismatch';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_classId_schoolYearId_fkey') THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_classId_schoolYearId_fkey"
      FOREIGN KEY ("classId", "schoolYearId") REFERENCES "Class"("id", "schoolYearId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_classId_schoolId_fkey') THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_classId_schoolId_fkey"
      FOREIGN KEY ("classId", "schoolId") REFERENCES "Class"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Enrollment_studentId_schoolId_fkey') THEN
    ALTER TABLE "Enrollment"
      ADD CONSTRAINT "Enrollment_studentId_schoolId_fkey"
      FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherClassSubject_classId_schoolYearId_fkey') THEN
    ALTER TABLE "TeacherClassSubject"
      ADD CONSTRAINT "TeacherClassSubject_classId_schoolYearId_fkey"
      FOREIGN KEY ("classId", "schoolYearId") REFERENCES "Class"("id", "schoolYearId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherClassSubject_classId_schoolId_fkey') THEN
    ALTER TABLE "TeacherClassSubject"
      ADD CONSTRAINT "TeacherClassSubject_classId_schoolId_fkey"
      FOREIGN KEY ("classId", "schoolId") REFERENCES "Class"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherClassSubject_subjectId_schoolId_fkey') THEN
    ALTER TABLE "TeacherClassSubject"
      ADD CONSTRAINT "TeacherClassSubject_subjectId_schoolId_fkey"
      FOREIGN KEY ("subjectId", "schoolId") REFERENCES "Subject"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherClassSubject_schoolYearId_schoolId_fkey') THEN
    ALTER TABLE "TeacherClassSubject"
      ADD CONSTRAINT "TeacherClassSubject_schoolYearId_schoolId_fkey"
      FOREIGN KEY ("schoolYearId", "schoolId") REFERENCES "SchoolYear"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_classId_schoolYearId_fkey') THEN
    ALTER TABLE "Grade"
      ADD CONSTRAINT "Grade_classId_schoolYearId_fkey"
      FOREIGN KEY ("classId", "schoolYearId") REFERENCES "Class"("id", "schoolYearId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_classId_schoolId_fkey') THEN
    ALTER TABLE "Grade"
      ADD CONSTRAINT "Grade_classId_schoolId_fkey"
      FOREIGN KEY ("classId", "schoolId") REFERENCES "Class"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_studentId_schoolId_fkey') THEN
    ALTER TABLE "Grade"
      ADD CONSTRAINT "Grade_studentId_schoolId_fkey"
      FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_subjectId_schoolId_fkey') THEN
    ALTER TABLE "Grade"
      ADD CONSTRAINT "Grade_subjectId_schoolId_fkey"
      FOREIGN KEY ("subjectId", "schoolId") REFERENCES "Subject"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_schoolYearId_schoolId_fkey') THEN
    ALTER TABLE "Grade"
      ADD CONSTRAINT "Grade_schoolYearId_schoolId_fkey"
      FOREIGN KEY ("schoolYearId", "schoolId") REFERENCES "SchoolYear"("id", "schoolId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
