-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeForm_appointmentId_key" ON "IntakeForm"("appointmentId");

-- CreateIndex
CREATE INDEX "IntakeForm_appointmentId_idx" ON "IntakeForm"("appointmentId");

-- CreateIndex
CREATE INDEX "IntakeForm_patientId_idx" ON "IntakeForm"("patientId");

-- CreateIndex
CREATE INDEX "IntakeForm_completed_idx" ON "IntakeForm"("completed");

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
