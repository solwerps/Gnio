-- CreateTable
CREATE TABLE `Documento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `empresaId` INTEGER NOT NULL,
    `operacion` ENUM('COMPRA', 'VENTA') NOT NULL,
    `fechaEmision` DATETIME(3) NOT NULL,
    `fechaTrabajo` DATETIME(3) NOT NULL,
    `tipoDte` VARCHAR(191) NOT NULL,
    `serie` VARCHAR(191) NOT NULL,
    `numeroDte` VARCHAR(191) NOT NULL,
    `numeroAutorizacion` VARCHAR(191) NOT NULL,
    `nitEmisor` VARCHAR(191) NOT NULL,
    `nombreEmisor` VARCHAR(191) NOT NULL,
    `codigoEstablecimiento` VARCHAR(191) NULL,
    `nombreEstablecimiento` VARCHAR(191) NULL,
    `nitReceptor` VARCHAR(191) NULL,
    `nombreReceptor` VARCHAR(191) NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'GTQ',
    `montoTotal` DECIMAL(18, 2) NOT NULL,
    `montoBien` DECIMAL(18, 2) NULL,
    `montoServicio` DECIMAL(18, 2) NULL,
    `iva` DECIMAL(18, 2) NULL,
    `cuentaDebeId` INTEGER NULL,
    `cuentaHaberId` INTEGER NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `comentario` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Documento_uuid_key`(`uuid`),
    INDEX `Documento_empresaId_operacion_fechaTrabajo_idx`(`empresaId`, `operacion`, `fechaTrabajo`),
    UNIQUE INDEX `Documento_empresaId_operacion_tipoDte_serie_numeroDte_numero_key`(`empresaId`, `operacion`, `tipoDte`, `serie`, `numeroDte`, `numeroAutorizacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AsientoContable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresaId` INTEGER NOT NULL,
    `documentoId` INTEGER NOT NULL,
    `correlativo` INTEGER NOT NULL DEFAULT 0,
    `descripcion` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `referencia` VARCHAR(191) NULL,

    INDEX `AsientoContable_empresaId_fecha_idx`(`empresaId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partida` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asientoId` INTEGER NOT NULL,
    `cuentaId` INTEGER NOT NULL,
    `montoDebe` DECIMAL(18, 2) NOT NULL,
    `montoHaber` DECIMAL(18, 2) NOT NULL,
    `referencia` VARCHAR(191) NULL,

    INDEX `Partida_asientoId_idx`(`asientoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `Documento_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `Documento_cuentaDebeId_fkey` FOREIGN KEY (`cuentaDebeId`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documento` ADD CONSTRAINT `Documento_cuentaHaberId_fkey` FOREIGN KEY (`cuentaHaberId`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsientoContable` ADD CONSTRAINT `AsientoContable_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsientoContable` ADD CONSTRAINT `AsientoContable_documentoId_fkey` FOREIGN KEY (`documentoId`) REFERENCES `Documento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partida` ADD CONSTRAINT `Partida_asientoId_fkey` FOREIGN KEY (`asientoId`) REFERENCES `AsientoContable`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partida` ADD CONSTRAINT `Partida_cuentaId_fkey` FOREIGN KEY (`cuentaId`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
