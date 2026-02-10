-- Allow global users (SUPER_ADMIN, ADMIN) without school binding
ALTER TABLE "User"
  ALTER COLUMN "schoolId" DROP NOT NULL;
