ALTER TABLE "users" ADD COLUMN "tempDateOfBirth" TIMESTAMP(3);
SELECT * FROM "users" WHERE "dateOfBirth" !~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "users" SET "dateOfBirth" = NULL WHERE "dateOfBirth" !~ '^\d{4}-\d{2}-\d{2}$';
UPDATE "users" SET "tempDateOfBirth" = "dateOfBirth"::TIMESTAMP(3);
ALTER TABLE "users" RENAME COLUMN "dateOfBirth" TO "dateOfBirthOld";
ALTER TABLE "users" RENAME COLUMN "tempDateOfBirth" TO "dateOfBirth";
ALTER TABLE "users" DROP COLUMN "dateOfBirthOld";

