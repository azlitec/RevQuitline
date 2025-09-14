-- CreateTable
CREATE TABLE "DoctorPatientConnection" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "disconnectReason" TEXT,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "canDisconnect" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorPatientConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorPatientConnection_providerId_idx" ON "DoctorPatientConnection"("providerId");

-- CreateIndex
CREATE INDEX "DoctorPatientConnection_patientId_idx" ON "DoctorPatientConnection"("patientId");

-- CreateIndex
CREATE INDEX "DoctorPatientConnection_status_idx" ON "DoctorPatientConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorPatientConnection_providerId_patientId_treatmentType_key" ON "DoctorPatientConnection"("providerId", "patientId", "treatmentType");

-- AddForeignKey
ALTER TABLE "DoctorPatientConnection" ADD CONSTRAINT "DoctorPatientConnection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientConnection" ADD CONSTRAINT "DoctorPatientConnection_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
