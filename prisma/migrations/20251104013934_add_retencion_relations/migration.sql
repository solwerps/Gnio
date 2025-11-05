-- CreateTable
CREATE TABLE `retenciones_iva` (
    `uuid` CHAR(36) NOT NULL,
    `empresaId` INTEGER NOT NULL,
    `fechaTrabajo` DATE NOT NULL,
    `nitRetenedor` VARCHAR(191) NOT NULL,
    `nombreRetenedor` VARCHAR(191) NOT NULL,
    `estadoConstancia` VARCHAR(191) NOT NULL,
    `constancia` VARCHAR(191) NOT NULL,
    `fechaEmision` DATE NOT NULL,
    `totalFactura` DECIMAL(20, 2) NOT NULL,
    `importeNeto` DECIMAL(20, 2) NOT NULL,
    `afectoRetencion` DECIMAL(20, 2) NOT NULL,
    `totalRetencion` DECIMAL(20, 2) NOT NULL,

    INDEX `retenciones_iva_empresaId_fechaTrabajo_idx`(`empresaId`, `fechaTrabajo`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retenciones_isr` (
    `uuid` CHAR(36) NOT NULL,
    `empresaId` INTEGER NOT NULL,
    `fechaTrabajo` DATE NOT NULL,
    `nitRetenedor` VARCHAR(191) NOT NULL,
    `nombreRetenedor` VARCHAR(191) NOT NULL,
    `estadoConstancia` VARCHAR(191) NOT NULL,
    `constancia` VARCHAR(191) NOT NULL,
    `fechaEmision` DATE NOT NULL,
    `totalFactura` DECIMAL(20, 2) NOT NULL,
    `rentaImponible` DECIMAL(20, 2) NOT NULL,
    `totalRetencion` DECIMAL(20, 2) NOT NULL,

    INDEX `retenciones_isr_empresaId_fechaTrabajo_idx`(`empresaId`, `fechaTrabajo`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `retenciones_iva` ADD CONSTRAINT `retenciones_iva_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retenciones_isr` ADD CONSTRAINT `retenciones_isr_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
