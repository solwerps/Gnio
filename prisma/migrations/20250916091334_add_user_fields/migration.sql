/*
  Warnings:

  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updatedAt` on the `user` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `user` DROP PRIMARY KEY,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `appointmentDate` DATETIME(3) NULL,
    ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `country` VARCHAR(191) NULL,
    ADD COLUMN `dpi` VARCHAR(191) NULL,
    ADD COLUMN `nit` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `photo` VARCHAR(191) NULL,
    ADD COLUMN `prestationType` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);
