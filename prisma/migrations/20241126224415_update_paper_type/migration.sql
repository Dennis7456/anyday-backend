/*
  Warnings:

  - The values [RESEARCH_PAPER,THESIS,DISSERTATION] on the enum `PaperType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaperType_new" AS ENUM ('ESSAY', 'ADMISSION_ESSAY', 'ANNOTATED_BIBLIOGRAPHY', 'ARGUMENTATIVE_ESSAY', 'ARTICLE_REVIEW', 'BOOK_MOVIE_REVIEW', 'BUSINESS_PLAN', 'PRESENTATION_SPEECH', 'RESEARCH_PROPOSAL', 'CASE_STUDY', 'CRITICAL_THINKING', 'COURSE_WORK', 'TERM_PAPER', 'THESIS_DISSERTATION_CHAPTER', 'CREATIVE_WRITING', 'OTHER');
ALTER TABLE "orders" ALTER COLUMN "paperType" TYPE "PaperType_new" USING ("paperType"::text::"PaperType_new");
ALTER TYPE "PaperType" RENAME TO "PaperType_old";
ALTER TYPE "PaperType_new" RENAME TO "PaperType";
DROP TYPE "PaperType_old";
COMMIT;
