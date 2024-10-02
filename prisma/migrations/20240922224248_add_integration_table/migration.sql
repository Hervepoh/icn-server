-- CreateTable
CREATE TABLE `integration_documents` (
    `transaction_id` CHAR(36) NOT NULL,
    `sub_transaction_type` VARCHAR(191) NOT NULL,
    `bill_partner_company_name` VARCHAR(191) NOT NULL,
    `bill_partner_company_code` VARCHAR(191) NOT NULL,
    `bill_number` VARCHAR(191) NOT NULL,
    `bill_account_number` VARCHAR(191) NOT NULL,
    `bill_due_date` VARCHAR(191) NOT NULL,
    `paid_amount` VARCHAR(191) NOT NULL,
    `paid_date` VARCHAR(191) NOT NULL,
    `paid_by_msisdn` VARCHAR(191) NOT NULL,
    `transaction_status` VARCHAR(191) NOT NULL,
    `om_bill_payment_status` VARCHAR(191) NOT NULL,
    `integration_status` ENUM('PENDING', 'GENERATED', 'INTEGRATED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
