-- CreateTable
CREATE TABLE `customers_reference` (
    `id` CHAR(36) NOT NULL,
    `region` CHAR(50) NOT NULL,
    `agency` CHAR(50) NOT NULL,
    `service_no` VARCHAR(191) NOT NULL,
    `client_code` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `supply_ref` VARCHAR(191) NOT NULL,
    `meter_no` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
