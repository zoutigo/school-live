DO $$
BEGIN
  ALTER TYPE "SchoolRole" ADD VALUE IF NOT EXISTS 'SCHOOL_STAFF';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "AppRole" ADD VALUE IF NOT EXISTS 'SCHOOL_STAFF';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SchoolStaffFunction" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchoolStaffFunction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolStaffAssignment" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "functionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchoolStaffAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolStaffFunction_schoolId_name_key"
  ON "SchoolStaffFunction"("schoolId", "name");

CREATE INDEX IF NOT EXISTS "SchoolStaffFunction_schoolId_idx"
  ON "SchoolStaffFunction"("schoolId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolStaffAssignment_schoolId_functionId_userId_key"
  ON "SchoolStaffAssignment"("schoolId", "functionId", "userId");

CREATE INDEX IF NOT EXISTS "SchoolStaffAssignment_schoolId_idx"
  ON "SchoolStaffAssignment"("schoolId");

CREATE INDEX IF NOT EXISTS "SchoolStaffAssignment_functionId_idx"
  ON "SchoolStaffAssignment"("functionId");

CREATE INDEX IF NOT EXISTS "SchoolStaffAssignment_userId_idx"
  ON "SchoolStaffAssignment"("userId");

DO $$
BEGIN
  ALTER TABLE "SchoolStaffFunction"
    ADD CONSTRAINT "SchoolStaffFunction_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolStaffAssignment"
    ADD CONSTRAINT "SchoolStaffAssignment_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolStaffAssignment"
    ADD CONSTRAINT "SchoolStaffAssignment_functionId_fkey"
    FOREIGN KEY ("functionId") REFERENCES "SchoolStaffFunction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "SchoolStaffAssignment"
    ADD CONSTRAINT "SchoolStaffAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
