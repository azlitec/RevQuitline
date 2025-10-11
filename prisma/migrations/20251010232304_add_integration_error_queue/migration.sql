-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('pending', 'retrying', 'failed', 'resolved');

-- CreateTable
CREATE TABLE "IntegrationError" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "orderId" TEXT,
    "entityType" TEXT NOT NULL,
    "source" TEXT,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastTriedAt" TIMESTAMP(3),
    "status" "IngestionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationError_patientId_idx" ON "IntegrationError"("patientId");

-- CreateIndex
CREATE INDEX "IntegrationError_orderId_idx" ON "IntegrationError"("orderId");

-- CreateIndex
CREATE INDEX "IntegrationError_status_idx" ON "IntegrationError"("status");

-- CreateIndex
CREATE INDEX "IntegrationError_nextRetryAt_idx" ON "IntegrationError"("nextRetryAt");

-- AddForeignKey
ALTER TABLE "IntegrationError" ADD CONSTRAINT "IntegrationError_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationError" ADD CONSTRAINT "IntegrationError_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "InvestigationOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
