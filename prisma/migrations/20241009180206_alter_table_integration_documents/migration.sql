-- AlterTable
ALTER TABLE `integration_documents` MODIFY `integration_status` ENUM('WAIT_GENERATION', 'GENERATED', 'PENDING', 'ONGOING', 'INTEGRATED', 'CANCELED') NOT NULL;
