/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,localId]` on the table `Nomenclatura` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `localId` to the `Nomenclatura` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nomenclatura` ADD COLUMN `localId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `RegimenIsrFila` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orden` INTEGER NOT NULL,
    `idRegimen` INTEGER NOT NULL,
    `regimenSistema` VARCHAR(191) NOT NULL,
    `nombreRegimen` VARCHAR(191) NOT NULL,
    `nombreComun` VARCHAR(191) NOT NULL,
    `porcentajeIsr` DOUBLE NOT NULL,
    `paraIsrDe` DOUBLE NOT NULL,
    `hastaIsrDe` DOUBLE NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `presentaAnual` VARCHAR(191) NOT NULL,
    `limiteSalarioActual` DOUBLE NOT NULL,
    `cantidadSalariosAnio` DOUBLE NOT NULL,
    `limiteFacturacionAnual` DOUBLE NOT NULL,
    `lugarVenta` VARCHAR(191) NOT NULL,
    `tipoActividad` VARCHAR(191) NOT NULL,
    `opcionSujetoRetencionIsr` VARCHAR(191) NOT NULL,
    `presentaFacturas` VARCHAR(191) NOT NULL,
    `retencionIva` VARCHAR(191) NOT NULL,
    `retencionIsr` VARCHAR(191) NOT NULL,
    `presentanIso` VARCHAR(191) NOT NULL,
    `presentaInventarios` VARCHAR(191) NOT NULL,
    `libroCompras` VARCHAR(191) NOT NULL,
    `libroVentas` VARCHAR(191) NOT NULL,
    `libroDiario` VARCHAR(191) NOT NULL,
    `libroDiarioDetalle` VARCHAR(191) NOT NULL,
    `libroMayor` VARCHAR(191) NOT NULL,
    `balanceGeneralEstadoResult` VARCHAR(191) NOT NULL,
    `estadosFinancieros` VARCHAR(191) NOT NULL,
    `conciliacionBancaria` VARCHAR(191) NOT NULL,
    `asientoContable` VARCHAR(191) NOT NULL,
    `tenantId` INTEGER NULL,
    `isSeed` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RegimenIsrFila_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Nomenclatura_tenantId_localId_idx` ON `Nomenclatura`(`tenantId`, `localId`);

-- CreateIndex
CREATE UNIQUE INDEX `Nomenclatura_tenantId_localId_key` ON `Nomenclatura`(`tenantId`, `localId`);

-- AddForeignKey
ALTER TABLE `RegimenIsrFila` ADD CONSTRAINT `RegimenIsrFila_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
