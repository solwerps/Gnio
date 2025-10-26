/*
  Warnings:

  - Added the required column `tenantId` to the `Nomenclatura` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nomenclatura` ADD COLUMN `tenantId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('PERSONAL', 'COMPANY') NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Membership` (
    `userId` INTEGER NOT NULL,
    `tenantId` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'COLLABORATOR', 'ACCOUNTANT', 'EMPRESA_USER') NOT NULL DEFAULT 'OWNER',

    PRIMARY KEY (`userId`, `tenantId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegimenIvaFila` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orden` INTEGER NOT NULL,
    `idRegimen` INTEGER NOT NULL,
    `regimenSistema` VARCHAR(191) NOT NULL,
    `nombreRegimen` VARCHAR(191) NOT NULL,
    `nombreComun` VARCHAR(191) NOT NULL,
    `porcentajeIva` DOUBLE NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `presentaAnual` VARCHAR(191) NOT NULL,
    `limiteSalarioActual` DOUBLE NOT NULL,
    `cantidadSalariosAnio` DOUBLE NOT NULL,
    `limiteFacturacionAnual` DOUBLE NOT NULL,
    `lugarVenta` VARCHAR(191) NOT NULL,
    `tipoActividad` VARCHAR(191) NOT NULL,
    `opcionSujetoRetencionIva` VARCHAR(191) NOT NULL,
    `porcentajeRetencionIva` DOUBLE NOT NULL,
    `montoRetencionMayorIgual` DOUBLE NOT NULL,
    `opcionExentoIva` VARCHAR(191) NOT NULL,
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

    INDEX `RegimenIvaFila_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Nomenclatura_tenantId_idx` ON `Nomenclatura`(`tenantId`);

-- AddForeignKey
ALTER TABLE `Tenant` ADD CONSTRAINT `Tenant_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Nomenclatura` ADD CONSTRAINT `Nomenclatura_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegimenIvaFila` ADD CONSTRAINT `RegimenIvaFila_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
