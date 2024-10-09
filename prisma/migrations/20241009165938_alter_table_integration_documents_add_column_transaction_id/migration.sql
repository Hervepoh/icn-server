/*
  Warnings:

  - Added the required column `transactionId` to the `integration_documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `integration_documents` ADD COLUMN `transactionId` VARCHAR(191) NOT NULL;
