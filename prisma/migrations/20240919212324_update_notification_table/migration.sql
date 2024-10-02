/*
  Warnings:

  - You are about to drop the column `createdAt` on the `audits` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transaction_details` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `transaction_details` table. All the data in the column will be lost.
  - You are about to drop the `internal_notifications` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updated_at` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transaction_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `audits` DROP COLUMN `createdAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'unread',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `transaction_details` DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `internal_notifications`;
