-- CreateEnum
CREATE TYPE "EncounterMode" AS ENUM ('in_person', 'telemedicine', 'phone', 'messaging');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProgressNoteStatus" AS ENUM ('draft', 'finalized', 'amended');

-- CreateEnum
CREATE TYPE "InvestigationOrderStatus" AS ENUM ('ordered', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "ObservationInterpretation" AS ENUM ('normal', 'abnormal', 'critical');

-- CreateEnum
CREATE TYPE "CorrespondenceDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "CorrespondenceCategory" AS ENUM ('referral', 'reply', 'discharge', 'memo');

-- CreateEnum
CREATE TYPE "TransmissionChannel" AS ENUM ('email', 'fax', 'portal', 'print', 'other');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'read', 'update', 'delete', 'view', 'finalize', 'amend', 'review', 'send');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('api', 'system', 'integration');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('encounter', 'progress_note', 'investigation_order', 'investigation_result', 'correspondence', 'template', 'user', 'appointment');

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" TEXT NOT NULL,
    "mode" "EncounterMode" NOT NULL DEFAULT 'in_person',
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "location" TEXT,
    "renderingProviderId" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressNote" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "cosignerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ProgressNoteStatus" NOT NULL DEFAULT 'draft',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "summary" TEXT,
    "autosavedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "amendedFromId" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationOrder" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" "InvestigationOrderStatus" NOT NULL DEFAULT 'ordered',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationResult" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "value" TEXT,
    "units" TEXT,
    "referenceRangeLow" DOUBLE PRECISION,
    "referenceRangeHigh" DOUBLE PRECISION,
    "referenceRangeText" TEXT,
    "interpretation" "ObservationInterpretation",
    "performer" TEXT,
    "observedAt" TIMESTAMP(3),
    "fhirObservation" JSONB,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correspondence" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "senderId" TEXT,
    "recipients" JSONB NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mergeFields" JSONB,
    "attachments" JSONB,
    "direction" "CorrespondenceDirection" NOT NULL,
    "category" "CorrespondenceCategory" NOT NULL,
    "transmissionChannel" "TransmissionChannel",
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Correspondence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "ip" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'api',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "category" "CorrespondenceCategory",
    "htmlContent" TEXT NOT NULL,
    "fields" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Encounter_patientId_idx" ON "Encounter"("patientId");

-- CreateIndex
CREATE INDEX "Encounter_providerId_idx" ON "Encounter"("providerId");

-- CreateIndex
CREATE INDEX "Encounter_appointmentId_idx" ON "Encounter"("appointmentId");

-- CreateIndex
CREATE INDEX "Encounter_startTime_idx" ON "Encounter"("startTime");

-- CreateIndex
CREATE INDEX "Encounter_status_idx" ON "Encounter"("status");

-- CreateIndex
CREATE INDEX "ProgressNote_encounterId_idx" ON "ProgressNote"("encounterId");

-- CreateIndex
CREATE INDEX "ProgressNote_patientId_idx" ON "ProgressNote"("patientId");

-- CreateIndex
CREATE INDEX "ProgressNote_authorId_idx" ON "ProgressNote"("authorId");

-- CreateIndex
CREATE INDEX "ProgressNote_status_idx" ON "ProgressNote"("status");

-- CreateIndex
CREATE INDEX "ProgressNote_finalizedAt_idx" ON "ProgressNote"("finalizedAt");

-- CreateIndex
CREATE INDEX "InvestigationOrder_patientId_idx" ON "InvestigationOrder"("patientId");

-- CreateIndex
CREATE INDEX "InvestigationOrder_providerId_idx" ON "InvestigationOrder"("providerId");

-- CreateIndex
CREATE INDEX "InvestigationOrder_encounterId_idx" ON "InvestigationOrder"("encounterId");

-- CreateIndex
CREATE INDEX "InvestigationOrder_status_idx" ON "InvestigationOrder"("status");

-- CreateIndex
CREATE INDEX "InvestigationOrder_orderedAt_idx" ON "InvestigationOrder"("orderedAt");

-- CreateIndex
CREATE INDEX "InvestigationResult_orderId_idx" ON "InvestigationResult"("orderId");

-- CreateIndex
CREATE INDEX "InvestigationResult_observedAt_idx" ON "InvestigationResult"("observedAt");

-- CreateIndex
CREATE INDEX "InvestigationResult_interpretation_idx" ON "InvestigationResult"("interpretation");

-- CreateIndex
CREATE INDEX "InvestigationResult_reviewed_idx" ON "InvestigationResult"("reviewed");

-- CreateIndex
CREATE INDEX "Correspondence_patientId_idx" ON "Correspondence"("patientId");

-- CreateIndex
CREATE INDEX "Correspondence_encounterId_idx" ON "Correspondence"("encounterId");

-- CreateIndex
CREATE INDEX "Correspondence_direction_idx" ON "Correspondence"("direction");

-- CreateIndex
CREATE INDEX "Correspondence_category_idx" ON "Correspondence"("category");

-- CreateIndex
CREATE INDEX "Correspondence_sentAt_idx" ON "Correspondence"("sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Template_name_key" ON "Template"("name");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_renderingProviderId_fkey" FOREIGN KEY ("renderingProviderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressNote" ADD CONSTRAINT "ProgressNote_amendedFromId_fkey" FOREIGN KEY ("amendedFromId") REFERENCES "ProgressNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationOrder" ADD CONSTRAINT "InvestigationOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationOrder" ADD CONSTRAINT "InvestigationOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationOrder" ADD CONSTRAINT "InvestigationOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationResult" ADD CONSTRAINT "InvestigationResult_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "InvestigationOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationResult" ADD CONSTRAINT "InvestigationResult_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correspondence" ADD CONSTRAINT "Correspondence_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
