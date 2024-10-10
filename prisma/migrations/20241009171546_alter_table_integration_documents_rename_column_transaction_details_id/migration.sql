/*
  Warnings:

  - You are about to drop the column `transactionDeatilsId` on the `integration_documents` table. All the data in the column will be lost.
  - Added the required column `transactionDetailsId` to the `integration_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `integration_documents` DROP COLUMN `transactionDeatilsId`,
    ADD COLUMN `transactionDetailsId` VARCHAR(191) NOT NULL;
