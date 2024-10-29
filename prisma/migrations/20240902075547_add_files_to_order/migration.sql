/*
  Warnings:

  - Added the required column `lastModified` to the `files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastModifiedDate` to the `files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "files" ADD COLUMN     "lastModified" TEXT NOT NULL,
ADD COLUMN     "lastModifiedDate" TEXT NOT NULL;
