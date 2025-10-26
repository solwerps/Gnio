-- CreateTable
CREATE TABLE `Nomenclatura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `versionGNIO` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NomenclaturaCuenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nomenclaturaId` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `cuenta` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `debeHaber` ENUM('DEBE', 'HABER') NOT NULL,
    `principalDetalle` ENUM('P', 'D') NOT NULL,
    `nivel` INTEGER NOT NULL,
    `tipo` ENUM('BALANCE_GENERAL', 'ESTADO_RESULTADOS', 'CAPITAL') NOT NULL,
    `naturaleza` ENUM('ACTIVO', 'PASIVO', 'CAPITAL', 'INGRESOS', 'COSTOS', 'GASTOS', 'OTROS_INGRESOS', 'OTROS_GASTOS', 'REVISAR') NOT NULL,
    `lockCuenta` BOOLEAN NOT NULL DEFAULT false,
    `lockDescripcion` BOOLEAN NOT NULL DEFAULT false,
    `lockDebeHaber` BOOLEAN NOT NULL DEFAULT false,
    `lockPrincipalDetalle` BOOLEAN NOT NULL DEFAULT false,
    `lockNivel` BOOLEAN NOT NULL DEFAULT false,
    `lockTipo` BOOLEAN NOT NULL DEFAULT false,
    `lockNaturaleza` BOOLEAN NOT NULL DEFAULT false,
    `isPlantilla` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NomenclaturaCuenta` ADD CONSTRAINT `NomenclaturaCuenta_nomenclaturaId_fkey` FOREIGN KEY (`nomenclaturaId`) REFERENCES `Nomenclatura`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
