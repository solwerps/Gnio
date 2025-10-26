-- CreateIndex
CREATE INDEX `Afiliaciones_regimenIvaId_idx` ON `Afiliaciones`(`regimenIvaId`);

-- CreateIndex
CREATE INDEX `Afiliaciones_regimenIsrId_idx` ON `Afiliaciones`(`regimenIsrId`);

-- CreateIndex
CREATE INDEX `Afiliaciones_nomenclaturaId_idx` ON `Afiliaciones`(`nomenclaturaId`);

-- CreateIndex
CREATE INDEX `CuentaBancaria_cuentaContableId_idx` ON `CuentaBancaria`(`cuentaContableId`);

-- AddForeignKey
ALTER TABLE `Afiliaciones` ADD CONSTRAINT `Afiliaciones_regimenIvaId_fkey` FOREIGN KEY (`regimenIvaId`) REFERENCES `RegimenIvaFila`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Afiliaciones` ADD CONSTRAINT `Afiliaciones_regimenIsrId_fkey` FOREIGN KEY (`regimenIsrId`) REFERENCES `RegimenIsrFila`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Afiliaciones` ADD CONSTRAINT `Afiliaciones_nomenclaturaId_fkey` FOREIGN KEY (`nomenclaturaId`) REFERENCES `Nomenclatura`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CuentaBancaria` ADD CONSTRAINT `CuentaBancaria_cuentaContableId_fkey` FOREIGN KEY (`cuentaContableId`) REFERENCES `NomenclaturaCuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `cuentabancaria` RENAME INDEX `CuentaBancaria_empresaId_fkey` TO `CuentaBancaria_empresaId_idx`;
