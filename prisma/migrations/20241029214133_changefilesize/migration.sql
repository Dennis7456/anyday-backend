-- -- Step 1: Add a new temporary column to store the file size as a string
-- ALTER TABLE "files" ADD COLUMN "size_temp" INTEGER;

-- -- Step 2: Copy the data from the old column to the new one, converting the integer to a string
-- -- UPDATE "files" SET "size_temp" = "size"::TEXT;

-- -- Step 2: Copy the data from the old column to the new one, converting it if necessary
-- -- If the current size column is a string, cast it to an integer
-- UPDATE "files" SET "size_temp" = CAST("size" AS INTEGER);

-- -- Step 3: Drop the old column
-- ALTER TABLE "files" DROP COLUMN "size";

-- -- Step 4: Rename the temporary column to the original name
-- ALTER TABLE "files" RENAME COLUMN "size_temp" TO "size";