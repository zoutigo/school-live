-- AlterTable
ALTER TABLE "AcademicLevel" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Curriculum" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CurriculumSubject" ALTER COLUMN "schoolId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "code" TEXT,
ALTER COLUMN "schoolId" DROP NOT NULL;

-- Partial unique indexes: Postgres treats each NULL as distinct, so the
-- existing @@unique([schoolId, code|name]) constraints do not prevent
-- duplicate national (schoolId = NULL) rows. Enforce national uniqueness
-- explicitly on the stable `code` column.
CREATE UNIQUE INDEX "subject_code_national_unique" ON "Subject" ("code") WHERE "schoolId" IS NULL;
CREATE UNIQUE INDEX "academiclevel_code_national_unique" ON "AcademicLevel" ("code") WHERE "schoolId" IS NULL;
