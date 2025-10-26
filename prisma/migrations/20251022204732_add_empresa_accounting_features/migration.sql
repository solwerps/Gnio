-- CreateTable
CREATE TABLE `Empresa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NOT NULL,
    `sectorEconomico` VARCHAR(191) NOT NULL,
    `razonSocial` ENUM('Individual', 'Juridico') NOT NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `infoIndividual` JSON NULL,
    `infoJuridico` JSON NULL,
    `direccionFiscal` JSON NULL,
    `contacto` JSON NULL,
    `afiliacionesId` INTEGER NULL,
    `gestionesId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Empresa_afiliacionesId_key`(`afiliacionesId`),
    UNIQUE INDEX `Empresa_gestionesId_key`(`gestionesId`),
    INDEX `idx_empresa_tenant_nit`(`tenant`, `nit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Afiliaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regimenIvaId` INTEGER NULL,
    `regimenIsrId` INTEGER NULL,
    `nomenclaturaId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Obligacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `afiliacionesId` INTEGER NOT NULL,
    `impuesto` VARCHAR(191) NOT NULL,
    `codigoFormulario` VARCHAR(191) NULL,
    `fechaPresentacion` DATETIME(3) NULL,
    `nombreObligacion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gestiones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correlativos` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FolioLibro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gestionesId` INTEGER NOT NULL,
    `libro` VARCHAR(191) NOT NULL,
    `disponibles` INTEGER NOT NULL DEFAULT 0,
    `usados` INTEGER NOT NULL DEFAULT 0,
    `ultimaFecha` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CuentaBancaria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `banco` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `moneda` VARCHAR(191) NOT NULL,
    `saldoInicial` DECIMAL(18, 2) NOT NULL,
    `cuentaContableId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Empresa` ADD CONSTRAINT `Empresa_afiliacionesId_fkey` FOREIGN KEY (`afiliacionesId`) REFERENCES `Afiliaciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Empresa` ADD CONSTRAINT `Empresa_gestionesId_fkey` FOREIGN KEY (`gestionesId`) REFERENCES `Gestiones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Obligacion` ADD CONSTRAINT `Obligacion_afiliacionesId_fkey` FOREIGN KEY (`afiliacionesId`) REFERENCES `Afiliaciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FolioLibro` ADD CONSTRAINT `FolioLibro_gestionesId_fkey` FOREIGN KEY (`gestionesId`) REFERENCES `Gestiones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuentaBancaria` ADD CONSTRAINT `CuentaBancaria_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
