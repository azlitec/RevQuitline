/*
  Warnings:

  - The `type` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('consultation', 'follow_up', 'emergency', 'quitline_smoking_cessation');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "serviceName" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "ServiceType" NOT NULL DEFAULT 'consultation';
