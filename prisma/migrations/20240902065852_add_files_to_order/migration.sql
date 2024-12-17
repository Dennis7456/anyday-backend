/*
  Warnings:

  - You are about to drop the column `description` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `documentPath` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `orders` table. All the data in the column will be lost.
  - Added the required column `dueDate` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfPages` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paperType` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "description",
DROP COLUMN "documentPath",
DROP COLUMN "title",
ADD COLUMN     "dueDate" TEXT NOT NULL,
ADD COLUMN     "numberOfPages" INTEGER NOT NULL,
ADD COLUMN     "paperType" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
