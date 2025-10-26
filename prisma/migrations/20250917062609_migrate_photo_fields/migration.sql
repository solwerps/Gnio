/*
  Warnings:

  - You are about to drop the column `photo` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `photo`,
    ADD COLUMN `photoPublicId` VARCHAR(191) NULL,
    ADD COLUMN `photoUrl` VARCHAR(191) NULL;
