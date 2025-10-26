-- CreateTable
CREATE TABLE `Tarea` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `estado` ENUM('PRIORIDAD', 'PENDIENTE', 'EN_TRABAJO', 'REALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    `tipo` VARCHAR(191) NULL,
    `fecha` DATETIME(3) NULL,
    `recordatorio` BOOLEAN NOT NULL DEFAULT false,
    `empresa` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tarea_tenantId_userId_estado_fecha_idx`(`tenantId`, `userId`, `estado`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tarea` ADD CONSTRAINT `Tarea_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tarea` ADD CONSTRAINT `Tarea_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
