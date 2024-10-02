/*
  Warnings:

  - You are about to drop the `audit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `audit` DROP FOREIGN KEY `audit_userId_fkey`;

-- DropTable
DROP TABLE `audit`;

-- CreateTable
CREATE TABLE `audits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `action` ENUM('LOGIN', 'LOGOUT') NOT NULL,
    `details` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source` ENUM('USER', 'SYSTEM') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audits` ADD CONSTRAINT `audits_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
