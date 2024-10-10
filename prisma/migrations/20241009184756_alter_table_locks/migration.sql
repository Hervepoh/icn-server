/*
  Warnings:

  - You are about to drop the `locks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `locks`;

-- CreateTable
CREATE TABLE `job_locks` (
    `job_name` VARCHAR(191) NOT NULL,
    `is_running` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`job_name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
