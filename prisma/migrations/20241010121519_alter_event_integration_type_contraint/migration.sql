-- AlterTable
ALTER TABLE `integration_documents` MODIFY `integration_status` ENUM('WAIT_GENERATION', 'GENERATED', 'PENDING', 'ONGOING', 'ONGOING_WITH_ISSUE', 'INTEGRATED', 'CANCELED') NOT NULL;
