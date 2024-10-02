-- AlterTable
ALTER TABLE `notifications` MODIFY `method` ENUM('EMAIL', 'WHATSAPP', 'INTERN', 'AVAILABLE') NOT NULL,
    MODIFY `template` VARCHAR(191) NULL;
