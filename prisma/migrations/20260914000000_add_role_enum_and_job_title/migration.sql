-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'BRANCH_MANAGER', 'SALES_EXECUTIVE');
    END IF;
END$$;

-- AlterTable: Add job_title column if not exists
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(50);

-- Populate job_title from existing free-text role
UPDATE "employees" SET "job_title" = "role" WHERE "job_title" IS NULL;

-- Convert role column to Role enum with least privilege default for unrecognized titles
ALTER TABLE "employees"
  ALTER COLUMN "role" TYPE "Role"
  USING (
    CASE
      WHEN "role" ILIKE '%system%admin%' OR "role" ILIKE '%administrator%' OR "role" ILIKE '%founder%' THEN 'SYSTEM_ADMIN'::"Role"
      WHEN "role" = 'Branch Manager' OR "role" ILIKE '%branch%manager%' THEN 'BRANCH_MANAGER'::"Role"
      WHEN "role" = 'Sales Executive' OR "role" = 'SALES_EXECUTIVE' THEN 'SALES_EXECUTIVE'::"Role"
      ELSE 'SALES_EXECUTIVE'::"Role"
    END
  );

-- Set default and NOT NULL constraint on employees.role
ALTER TABLE "employees" ALTER COLUMN "role" SET DEFAULT 'SALES_EXECUTIVE'::"Role";
ALTER TABLE "employees" ALTER COLUMN "role" SET NOT NULL;
