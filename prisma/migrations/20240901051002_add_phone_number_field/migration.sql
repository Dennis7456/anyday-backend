/*
  Warnings:

  - Added the required column `phoneNumber` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- ALTER TABLE "User" ADD COLUMN "phoneNumber" VARCHAR(255) NOT NULL;

-- Update existing rows with a default value or empty string
-- UPDATE "users" SET "phoneNumber" = '' WHERE "phoneNumber" IS NULL;

-- ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL;
-- Add the column as nullable
ALTER TABLE "users" ADD COLUMN "phoneNumber" VARCHAR(255);
ALTER TABLE "users" ALTER COLUMN "phoneNumber" SET NOT NULL;


