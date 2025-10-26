-- AlterTable
ALTER TABLE `nomenclaturacuenta` ADD COLUMN `lockAdd` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lockDelete` BOOLEAN NOT NULL DEFAULT false;
