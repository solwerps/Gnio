/*
  Warnings:

  - You are about to drop the `asientocontable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `documento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `partida` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `asientocontable` DROP FOREIGN KEY `AsientoContable_documentoId_fkey`;

-- DropForeignKey
ALTER TABLE `asientocontable` DROP FOREIGN KEY `AsientoContable_empresaId_fkey`;

-- DropForeignKey
ALTER TABLE `documento` DROP FOREIGN KEY `Documento_cuentaDebeId_fkey`;

-- DropForeignKey
ALTER TABLE `documento` DROP FOREIGN KEY `Documento_cuentaHaberId_fkey`;

-- DropForeignKey
ALTER TABLE `documento` DROP FOREIGN KEY `Documento_empresaId_fkey`;

-- DropForeignKey
ALTER TABLE `partida` DROP FOREIGN KEY `Partida_asientoId_fkey`;

-- DropForeignKey
ALTER TABLE `partida` DROP FOREIGN KEY `Partida_cuentaId_fkey`;

-- AlterTable
ALTER TABLE `empresa` ADD COLUMN `correlativoContador` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `asientocontable`;

-- DropTable
DROP TABLE `documento`;

-- DropTable
DROP TABLE `partida`;

-- CreateTable
CREATE TABLE `Cuenta` (
    `uuid` CHAR(36) NOT NULL,
    `cuenta` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,

    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoPoliza` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asientos_contables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correlativo` INTEGER NOT NULL,
    `tipoPolizaId` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `referencia` VARCHAR(191) NULL,
    `fecha` DATE NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `empresaId` INTEGER NOT NULL,

    INDEX `asientos_contables_empresaId_idx`(`empresaId`),
    INDEX `asientos_contables_fecha_idx`(`fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partidas` (
    `uuid` CHAR(36) NOT NULL,
    `montoDebe` DECIMAL(20, 2) NOT NULL,
    `montoHaber` DECIMAL(20, 2) NOT NULL,
    `referencia` VARCHAR(191) NULL,
    `cuentaId` VARCHAR(191) NOT NULL,
    `empresaId` INTEGER NULL,
    `asientoContableId` INTEGER NOT NULL,

    INDEX `partidas_asientoContableId_idx`(`asientoContableId`),
    INDEX `partidas_referencia_idx`(`referencia`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos` (
    `uuid` CHAR(36) NOT NULL,
    `identificadorUnico` VARCHAR(191) NOT NULL,
    `fechaEmision` DATE NOT NULL,
    `numeroAutorizacion` VARCHAR(191) NULL,
    `tipoDte` VARCHAR(191) NOT NULL,
    `serie` VARCHAR(191) NULL,
    `numeroDte` VARCHAR(191) NOT NULL,
    `nitEmisor` VARCHAR(191) NULL,
    `nombreEmisor` VARCHAR(191) NULL,
    `codigoEstablecimiento` VARCHAR(191) NULL,
    `nombreEstablecimiento` VARCHAR(191) NULL,
    `idReceptor` VARCHAR(191) NULL,
    `nombreReceptor` VARCHAR(191) NULL,
    `nitCertificador` VARCHAR(191) NULL,
    `nombreCertificador` VARCHAR(191) NULL,
    `moneda` VARCHAR(191) NOT NULL,
    `montoTotal` DECIMAL(20, 2) NOT NULL,
    `montoBien` DECIMAL(20, 2) NOT NULL,
    `montoServicio` DECIMAL(20, 2) NOT NULL,
    `facturaEstado` VARCHAR(191) NULL,
    `marcaAnulado` BOOLEAN NOT NULL DEFAULT false,
    `fechaAnulacion` DATE NULL,
    `iva` DECIMAL(20, 2) NULL,
    `petroleo` DECIMAL(20, 2) NULL,
    `turismoHospedaje` DECIMAL(20, 2) NULL,
    `turismoPasajes` DECIMAL(20, 2) NULL,
    `timbrePrensa` DECIMAL(20, 2) NULL,
    `bomberos` DECIMAL(20, 2) NULL,
    `tasaMunicipal` DECIMAL(20, 2) NULL,
    `bebidasAlcoholicas` DECIMAL(20, 2) NULL,
    `tabaco` DECIMAL(20, 2) NULL,
    `cemento` DECIMAL(20, 2) NULL,
    `bebidasNoAlcoholicas` DECIMAL(20, 2) NULL,
    `tarifaPortuaria` DECIMAL(20, 2) NULL,
    `tipoOperacion` ENUM('compra', 'venta') NOT NULL DEFAULT 'compra',
    `cuentaDebe` VARCHAR(191) NULL,
    `cuentaHaber` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'bien',
    `empresaId` INTEGER NOT NULL,
    `fechaTrabajo` DATE NOT NULL,
    `estado` INTEGER NOT NULL DEFAULT 1,
    `comentario` VARCHAR(191) NULL,

    UNIQUE INDEX `documentos_identificadorUnico_key`(`identificadorUnico`),
    INDEX `documentos_empresaId_idx`(`empresaId`),
    INDEX `documentos_fechaTrabajo_idx`(`fechaTrabajo`),
    INDEX `documentos_numeroDte_idx`(`numeroDte`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asientos_contables` ADD CONSTRAINT `asientos_contables_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asientos_contables` ADD CONSTRAINT `asientos_contables_tipoPolizaId_fkey` FOREIGN KEY (`tipoPolizaId`) REFERENCES `TipoPoliza`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_cuentaId_fkey` FOREIGN KEY (`cuentaId`) REFERENCES `Cuenta`(`uuid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partidas` ADD CONSTRAINT `partidas_asientoContableId_fkey` FOREIGN KEY (`asientoContableId`) REFERENCES `asientos_contables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_empresaId_fkey` FOREIGN KEY (`empresaId`) REFERENCES `Empresa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
