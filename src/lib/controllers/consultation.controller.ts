import type { NextRequest } from 'next/server';
import { auditView, auditCreate, auditUpdate, buildProvenanceMetadata } from '@/lib/audit/audit';
import { ConsultationService } from '@/lib/services/consultation.service';
import type {
  EmrConsultationListQuery,
  EmrConsultationCreate,
  EmrConsultationUpdate,
} from '@/lib/validators/emr';
import { ConsultationRepository } from '@/lib/repositories/consultation.repo';

/**
 * Consultation Controller
 * Thin orchestration layer between routes and ConsultationService:
 * - Shapes request/response
 * - Performs ownership checks if needed
 * - Emits audit logs with provenance metadata
 */
export class ConsultationController {
  /**
   * List consultations (encounters) for a provider-patient with pagination/filters.
   */
  static async list(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    query: EmrConsultationListQuery
  ) {
    const result = await ConsultationService.list(providerId, patientId, query);

    await auditView(
      request,
      session,
      'encounter',
      'list',
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        page: result.page,
        pageSize: result.pageSize,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
    );

    return result;
  }

  /**
   * Create a new consultation (encounter).
   * Returns encounter payload and optional draftNoteId (if status=in_progress).
   */
  static async create(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    body: EmrConsultationCreate
  ) {
    const created = await ConsultationService.createEncounter(providerId, patientId, body);

    await auditCreate(
      request,
      session,
      'encounter',
      created.encounter.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        appointmentId: created.encounter.appointmentId,
        type: created.encounter.type,
        status: created.encounter.status,
        draftNoteId: created.draftNoteId,
      })
    );

    return created;
  }

  /**
   * Update a consultation (encounter).
   * Performs ownership checks and audits the update.
   */
  static async update(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    body: EmrConsultationUpdate
  ) {
    // Ownership check: ensure the encounter belongs to this provider and patient
    const existing = await ConsultationRepository.getById(body.id);
    if (!existing) {
      throw Object.assign(new Error('Encounter not found'), { status: 404 });
    }
    if (existing.providerId !== providerId || existing.patientId !== patientId) {
      throw Object.assign(new Error('Forbidden: encounter does not belong to this provider/patient'), {
        status: 403,
      });
    }

    const updated = await ConsultationService.updateEncounter(providerId, body);

    await auditUpdate(
      request,
      session,
      'encounter',
      updated.encounter.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        appointmentId: updated.encounter.appointmentId,
        type: updated.encounter.type,
        status: updated.encounter.status,
        draftNoteId: updated.draftNoteId,
      })
    );

    return updated;
  }
}