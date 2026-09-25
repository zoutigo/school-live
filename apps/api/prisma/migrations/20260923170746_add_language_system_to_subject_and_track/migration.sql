-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "languageSystem" "SchoolLanguageSystem";

-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "languageSystem" "SchoolLanguageSystem";

-- Backfill: national subjects (schoolId IS NULL) seeded by
-- prisma/scripts/seed-national-catalog.mjs and
-- prisma/scripts/seed-national-tracks-cameroon.mjs, classified by the
-- language group each code was created under (no code is shared between
-- both groups).
UPDATE "Subject"
SET "languageSystem" = 'FRANCOPHONE'
WHERE "schoolId" IS NULL
  AND "code" IN (
    'FR', 'MATH', 'ANG', 'HIST', 'GEO', 'SVT', 'PHYS', 'CHIM', 'TECH',
    'EC', 'EPS', 'ART', 'MUS', 'EVS',
    'PHILO', 'LATIN', 'GREC', 'LV2', 'LV3', 'INFO'
  );

UPDATE "Subject"
SET "languageSystem" = 'ANGLOPHONE'
WHERE "schoolId" IS NULL
  AND "code" IN (
    'ENG_LANG', 'MATHS_EN', 'PHYS_EN', 'CHEM_EN', 'BIO_EN', 'GEO_EN',
    'HIST_EN', 'FR_EN', 'PE_EN', 'ART_EN', 'MUS_EN', 'CE_EN',
    'SCI_PRI', 'SOC_PRI',
    'LIT_EN', 'ECON_EN', 'PHIL_EN', 'CS_EN', 'CINE_EN', 'NLC_EN'
  );

-- Backfill: national tracks (schoolId IS NULL) seeded by
-- prisma/scripts/seed-national-tracks-cameroon.mjs.
UPDATE "Track"
SET "languageSystem" = 'FRANCOPHONE'
WHERE "schoolId" IS NULL
  AND "code" IN ('A1', 'A2', 'A3', 'A4', 'A5', 'AC', 'C', 'D', 'TI', 'BIL');

UPDATE "Track"
SET "languageSystem" = 'ANGLOPHONE'
WHERE "schoolId" IS NULL
  AND "code" IN (
    'ARTS_A1', 'ARTS_A2', 'ARTS_A3', 'ARTS_A4',
    'ARTS_A5', 'ARTS_A6', 'ARTS_A7', 'ARTS_A8',
    'SCI_S1', 'SCI_S2', 'SCI_S3', 'SCI_S4'
  );
