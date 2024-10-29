/*
  Warnings:

  - You are about to drop the column `lastModified` on the `files` table. All the data in the column will be lost.
  - You are about to drop the column `lastModifiedDate` on the `files` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "files" DROP COLUMN "lastModified",
DROP COLUMN "lastModifiedDate";
