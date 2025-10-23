import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { auditView, auditCreate, auditUpdate, auditFinalize, buildProvenanceMetadata } from '@/lib/audit/audit';
import { NotesService } from '@/lib/services/notes.service';
import type { EmrNotesListQuery } from '@/lib/validators/emr';
import type {
  z
} from 'zod';
import {
  ProgressNoteDraftCreateSchema,
  ProgressNoteUpdateSchema,
  ProgressNoteFinalizeSchema,
} from '@/lib/api/guard';
import { NotesRepository } from '@/lib/repositories/notes.repo';

/**
 * NotesController
 * Thin orchestration layer between routes and NotesService:
 * - Shapes request/response
 * - Performs ownership checks (encounter/provider/patient, note/provider/patient)
 * - Emits audit logs with provenance metadata
 */
export class NotesController {
  /**
   * List progress notes (SOAP) for a provider↔patient context with pagination and filters.
   */
  static async list(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    query: EmrNotesListQuery
  ) {
    const result = await NotesService.list(providerId, patientId, query);

    await auditView(
      request,
      session,
      'progress_note',
      'list',
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        page: result.page,
        pageSize: result.pageSize,
        encounterId: query.encounterId,
        status: query.status,
        keywords: query.keywords,
      })
    );

    return result;
  }

  /**
   * Create a new draft ProgressNote (SOAP) tied to an Encounter.
   * Validates encounter ownership (provider and patient).
   */
  static async createDraft(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    body: z.infer<typeof ProgressNoteDraftCreateSchema>
  ) {
    // Ownership: ensure the encounter belongs to provider and patient
    const enc = await prisma.encounter.findUnique({
      where: { id: body.encounterId },
      select: { id: true, providerId: true, patientId: true, appointmentId: true, type: true, status: true },
    });
    if (!enc) {
      throw Object.assign(new Error('Encounter not found'), { status: 404 });
    }
    if (enc.providerId !== providerId || enc.patientId !== patientId) {
      throw Object.assign(new Error('Forbidden: encounter does not belong to this provider/patient'), {
        status: 403,
      });
    }

    const created = await NotesService.createDraft({
      encounterId: body.encounterId,
      patientId: body.patientId,
      authorId: providerId,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      summary: body.summary,
      attachments: body.attachments,
    });

    await auditCreate(
      request,
      session,
      'progress_note',
      created.note.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        encounterId: enc.id,
        appointmentId: enc.appointmentId,
        type: enc.type,
        status: enc.status,
      })
    );

    return created;
  }

  /**
   * Update a draft ProgressNote (autosave).
   * Validates note ownership (encounter.providerId and note.patientId).
   */
  static async updateDraft(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    body: z.infer<typeof ProgressNoteUpdateSchema>
  ) {
    const existing = await NotesRepository.getWithOwnership(body.id);
    if (!existing) {
      throw Object.assign(new Error('Progress note not found'), { status: 404 });
    }
    const existingProviderId = existing.encounter?.providerId;
    if (existingProviderId !== providerId || existing.patientId !== patientId) {
      throw Object.assign(new Error('Forbidden: note does not belong to this provider/patient'), {
        status: 403,
      });
    }

    const updated = await NotesService.updateDraft(body.id, {
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
      summary: body.summary,
      attachments: body.attachments,
    });

    await auditUpdate(
      request,
      session,
      'progress_note',
      updated.note.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        encounterId: existing.encounter?.id,
      })
    );

    return updated;
  }

  /**
   * Finalize a ProgressNote (digital signature).
   * Validates note ownership and audits finalize action.
   */
  static async finalize(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    body: z.infer<typeof ProgressNoteFinalizeSchema>
  ) {
    const existing = await NotesRepository.getWithOwnership(body.id);
    if (!existing) {
      throw Object.assign(new Error('Progress note not found'), { status: 404 });
    }
    const existingProviderId = existing.encounter?.providerId;
    if (existingProviderId !== providerId || existing.patientId !== patientId) {
      throw Object.assign(new Error('Forbidden: note does not belong to this provider/patient'), {
        status: 403,
      });
    }

    const finalized = await NotesService.finalize(body.id, {
      signatureHash: body.signatureHash,
      finalizedAt: body.finalizedAt,
    });

    await auditFinalize(
      request,
      session,
      'progress_note',
      finalized.note.id,
      buildProvenanceMetadata(session, {
        providerId,
        patientId,
        encounterId: finalized.note.encounterId,
        finalizedAt: finalized.note.finalizedAt,
      })
    );

    return finalized;
  }
}