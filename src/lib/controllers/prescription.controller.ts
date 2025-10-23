import type { NextRequest } from 'next/server';
import {
  auditView,
  auditCreate,
  auditUpdate,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';
import { PrescriptionService } from '@/lib/services/prescription.service';
import {
  type PrescriptionCreateDTO,
  type PrescriptionUpdateDTO,
} from '@/lib/validators/prescription';
import { PrescriptionRepository, PrescriptionUpdateInput } from '@/lib/repositories/prescription.repo';
import type { UserRole } from '@/lib/api/guard';
import { PrescriptionStatus } from '@prisma/client';

/**
 * PrescriptionController
 * Production-ready controller for Prescription workflows backed by Prisma Prescription model.
 * Responsibilities:
 * - Shapes request/response payloads for API routes
 * - Performs ownership checks and role-based restrictions
 * - Emits audit logs with provenance metadata for all actions
 * - Delegates domain logic to PrescriptionService
 *
 * Note: Audit EntityType does not include "prescription"; log under "user" with metadata including entity: 'prescription'
 */
export class PrescriptionController {
  /**
   * Create a new prescription (provider scoped).
   * Expects validated DTO (PrescriptionCreateDTO) from route layer.
   */
  static async handleCreatePrescription(
    request: NextRequest,
    session: any,
    providerId: string,
    body: PrescriptionCreateDTO
  ) {
    const created = await PrescriptionService.createPrescription(providerId, body.patientId, body);

    await auditCreate(
      request,
      session,
      'user',
      created.prescription.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId: body.patientId,
        medicationName: body.medicationName,
        status: created.prescription.status,
        entity: 'prescription',
      })
    );

    return created;
  }

  /**
   * List prescriptions for the caller.
   * - If role is PROVIDER: list authored prescriptions with optional filters
   * - If role is USER (patient): list patient's own prescriptions
   */
  static async handleGetPrescriptions(
    request: NextRequest,
    session: any,
    userId: string,
    role: UserRole,
    filters?: {
      status?: PrescriptionStatus;
      dateRange?: { from?: Date | string; to?: Date | string };
      patientId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let result:
      | { items: any[]; total: number; limit: number; offset: number }
      | undefined;

    if (role === 'PROVIDER') {
      result = await PrescriptionRepository.getPrescriptionsByProvider(userId, filters);
      await auditView(
        request,
        session,
        'user',
        'prescription_list_provider',
        buildProvenanceMetadata(session, {
          providerId: userId,
          patientId: filters?.patientId,
          status: filters?.status,
          dateFrom: filters?.dateRange?.from,
          dateTo: filters?.dateRange?.to,
          limit: filters?.limit,
          offset: filters?.offset,
          entity: 'prescription',
        })
      );
    } else if (role === 'ADMIN' || role === 'CLERK') {
      // Admin/Clerk can view by provider or patient when provided; default to provider if given else patient self
      if (filters?.patientId) {
        result = await PrescriptionRepository.getPrescriptionsByPatient(filters.patientId, {
          status: filters.status,
          limit: filters.limit,
          offset: filters.offset,
        });
      } else {
        result = await PrescriptionRepository.getPrescriptionsByProvider(userId, filters);
      }
      await auditView(
        request,
        session,
        'user',
        'prescription_list_staff',
        buildProvenanceMetadata(session, {
          staffUserId: userId,
          patientId: filters?.patientId,
          status: filters?.status,
          dateFrom: filters?.dateRange?.from,
          dateTo: filters?.dateRange?.to,
          entity: 'prescription',
        })
      );
    } else {
      // Patient (USER) lists their own prescriptions; ignore other filters for privacy
      result = await PrescriptionRepository.getPrescriptionsByPatient(userId, {
        status: filters?.status,
        limit: filters?.limit,
        offset: filters?.offset,
      });
      await auditView(
        request,
        session,
        'user',
        'prescription_list_patient',
        buildProvenanceMetadata(session, {
          patientId: userId,
          status: filters?.status,
          entity: 'prescription',
        })
      );
    }

    return result!;
  }

  /**
   * Update prescription details. Provider or Admin only.
   * Ownership: Provider must own the prescription (providerId matches userId).
   */
  static async handleUpdatePrescription(
    request: NextRequest,
    session: any,
    prescriptionId: string,
    userId: string,
    role: UserRole,
    body: PrescriptionUpdateDTO
  ) {
    const existing = await PrescriptionRepository.getPrescriptionById(prescriptionId);
    if (!existing) {
      throw Object.assign(new Error('Prescription not found'), { status: 404 });
    }
    if (role === 'PROVIDER' && existing.providerId !== userId) {
      throw Object.assign(new Error('Forbidden: prescription does not belong to this provider'), { status: 403 });
    }
    if (role === 'USER') {
      throw Object.assign(new Error('Forbidden: patients cannot edit prescriptions'), { status: 403 });
    }

    const updateData: PrescriptionUpdateInput = {
      medicationName: body.medicationName,
      dosage: body.dosage,
      frequency: body.frequency,
      duration: body.duration,
      quantity: body.quantity,
      refills: body.refills,
      instructions: body.instructions,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      pharmacy: body.pharmacy,
      pharmacyPhone: body.pharmacyPhone,
      notes: body.notes,
    };
    const updated = await PrescriptionRepository.updatePrescription(prescriptionId, updateData);

    await auditUpdate(
      request,
      session,
      'user',
      updated.id,
      buildProvenanceMetadata(session, {
        providerId: updated.providerId,
        patientId: updated.patientId,
        medicationName: updated.medicationName,
        status: updated.status,
        entity: 'prescription',
      })
    );

    return { prescription: updated };
  }

  /**
   * Cancel prescription with reason. Provider or Admin only.
   * Ownership: Provider must own the prescription.
   * Emits cancellation notification via service.
   */
  static async handleCancelPrescription(
    request: NextRequest,
    session: any,
    prescriptionId: string,
    userId: string,
    role: UserRole,
    reason: string
  ) {
    const cancelled = await PrescriptionService.cancelPrescription(
      prescriptionId,
      reason,
      userId,
      role === 'PROVIDER' ? 'PROVIDER' : 'ADMIN'
    );

    await auditUpdate(
      request,
      session,
      'user',
      cancelled.prescription.id,
      buildProvenanceMetadata(session, {
        providerId: cancelled.prescription.providerId,
        patientId: cancelled.prescription.patientId,
        medicationName: cancelled.prescription.medicationName,
        status: cancelled.prescription.status,
        cancellationReason: reason,
        entity: 'prescription',
      })
    );

    return cancelled;
  }
}