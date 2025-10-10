-- CreateEnum
CREATE TYPE "ProviderApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "providerApprovalStatus" "ProviderApprovalStatus";
