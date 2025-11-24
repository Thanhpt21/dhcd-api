/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Config" DROP COLUMN "tenantId";
