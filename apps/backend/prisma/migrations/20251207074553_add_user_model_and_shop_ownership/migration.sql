/*
  Safe migration to add shop ownership without breaking existing data:
  1. Add ownerId as nullable column
  2. Create a default system user for existing shops
  3. Backfill existing shops with the system user
  4. Make ownerId NOT NULL after backfill
*/

-- Step 1: Add ownerId as nullable to avoid migration failure
ALTER TABLE "shops" ADD COLUMN "ownerId" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Step 2: Create a default system user for existing shops
-- This ensures existing shops have a valid owner after migration
INSERT INTO "users" ("id", "email", "name", "password", "createdAt", "updatedAt") 
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@tyler-platform.local', 
  'System Administrator',
  '$2b$10$placeholder.hash.for.system.user.not.for.login.purposes.only.migration',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("email") DO NOTHING;

-- Step 3: Backfill existing shops with the system user as owner
-- Only update shops that don't have an owner (ownerId is NULL)
UPDATE "shops" 
SET "ownerId" = '00000000-0000-0000-0000-000000000000'
WHERE "ownerId" IS NULL;

-- Step 4: Now make ownerId NOT NULL since all shops have an owner
ALTER TABLE "shops" ALTER COLUMN "ownerId" SET NOT NULL;

-- Step 5: Add the foreign key constraint
ALTER TABLE "shops" ADD CONSTRAINT "shops_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
