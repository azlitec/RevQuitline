import { prisma } from '@/lib/db';
import { ConsultationRepository } from '@/lib/repositories/consultation.repo';
import type {
  EmrConsultationListQuery,
  EmrConsultationCreate,
  EmrConsultationUpdate,
} from '@/lib/validators/emr';

/**
 * ConsultationService
 * Orchestrates consultation (Encounter) flows with minimal business logic:
 * - List encounters for provider↔patient with pagination/filters
 * - Create encounter; auto-create draft ProgressNote when status is in_progress
 * - Update encounter; detect transition to in_progress and auto-create draft note
 * - Flip appointment status to in-progress when encounter starts (if applicable)
 *
 * Audit calls are handled by controllers; this service focuses on domain operations.
 */
export class ConsultationService {
  /**
   * List encounters with latest note excerpts.
   */
  static async list(
    providerId: string,
    patientId: string,
    query: EmrConsultationListQuery
  ) {
    return ConsultationRepository.list(providerId, patientId, query);
  }

  /**
   * Create a new encounter; if status=in_progress, auto-create draft ProgressNote.
   * Returns encounter payload and optional draftNoteId.
   */
  static async createEncounter(
    providerId: string,
    patientId: string,
    body: EmrConsultationCreate
  ): Promise<{
    encounter: {
      id: string;
      patientId: string;
      providerId: string;
      appointmentId: string | null;
      type: string;
      mode: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
      renderingProviderId: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
    draftNoteId: string | null;
  }> {
    // Persist encounter
    const created = await ConsultationRepository.create(providerId, patientId, body);

    let draftNoteId: string | null = null;

    // If encounter begins immediately, auto-create a draft ProgressNote
    if (created.status === 'in_progress') {
      const note = await prisma.progressNote.create({
        data: {
          encounterId: created.id,
          patientId: created.patientId,
          authorId: providerId, // author as provider; adjust if scribe/assistant needed
          status: 'draft' as any,
          summary: null,
          autosavedAt: null,
        },
        select: { id: true },
      });
      draftNoteId = note.id;

      // If appointment exists and is scheduled/confirmed, flip to in-progress
      if (created.appointmentId) {
        const appt = await prisma.appointment.findUnique({ where: { id: created.appointmentId } });
        if (appt && (appt.status === 'scheduled' || appt.status === 'confirmed')) {
          await prisma.appointment.update({
            where: { id: created.appointmentId },
            data: { status: 'in-progress' },
          });
        }
      }
    }

    return { encounter: created, draftNoteId };
  }

  /**
   * Update an encounter; detect transition to in_progress and auto-create a draft ProgressNote.
   * Returns updated encounter payload and optional draftNoteId created on transition.
   */
  static async updateEncounter(
    providerId: string,
    body: EmrConsultationUpdate
  ): Promise<{
    encounter: {
      id: string;
      patientId: string;
      providerId: string;
      appointmentId: string | null;
      type: string;
      mode: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
      renderingProviderId: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
    draftNoteId: string | null;
  }> {
    const existing = await ConsultationRepository.getById(body.id);
    if (!existing) {
      throw Object.assign(new Error('Encounter not found'), { status: 404 });
    }

    const updated = await ConsultationRepository.update(body.id, body);

    let draftNoteId: string | null = null;
    const transitionedToInProgress =
      existing.status !== 'in_progress' && updated.status === 'in_progress';

    if (transitionedToInProgress) {
      const note = await prisma.progressNote.create({
        data: {
          encounterId: updated.id,
          patientId: updated.patientId,
          authorId: providerId,
          status: 'draft' as any,
          summary: null,
          autosavedAt: null,
        },
        select: { id: true },
      });
      draftNoteId = note.id;

      // Flip appointment to in-progress if applicable
      if (updated.appointmentId) {
        const appt = await prisma.appointment.findUnique({ where: { id: updated.appointmentId } });
        if (appt && (appt.status === 'scheduled' || appt.status === 'confirmed')) {
          await prisma.appointment.update({
            where: { id: updated.appointmentId },
            data: { status: 'in-progress' },
          });
        }
      }
    }

    return { encounter: updated, draftNoteId };
  }
}