/*
  Warnings:

  - You are about to alter the column `debeHaber` on the `nomenclaturacuenta` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `VarChar(191)`.
  - You are about to alter the column `principalDetalle` on the `nomenclaturacuenta` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `VarChar(191)`.
  - You are about to alter the column `tipo` on the `nomenclaturacuenta` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(6))` to `VarChar(191)`.
  - You are about to alter the column `naturaleza` on the `nomenclaturacuenta` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `nomenclatura` ADD COLUMN `ownerUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `nomenclaturacuenta` ALTER COLUMN `orden` DROP DEFAULT,
    MODIFY `debeHaber` VARCHAR(191) NOT NULL,
    MODIFY `principalDetalle` VARCHAR(191) NOT NULL,
    MODIFY `tipo` VARCHAR(191) NOT NULL,
    MODIFY `naturaleza` VARCHAR(191) NOT NULL,
    MODIFY `lockAdd` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `lockDelete` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `NomenclaturaCuenta_nomenclaturaId_orden_idx` ON `NomenclaturaCuenta`(`nomenclaturaId`, `orden`);

-- AddForeignKey
ALTER TABLE `Nomenclatura` ADD CONSTRAINT `Nomenclatura_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
