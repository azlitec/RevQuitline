import { prisma } from '@/lib/db';
import { NotesRepository } from '@/lib/repositories/notes.repo';
import { emitNoteFinalized } from '@/lib/events/bus';
import type { EmrNotesListQuery } from '@/lib/validators/emr';

/**
 * NotesService
 * Orchestrates Progress Note (SOAP) workflows within a provider↔patient EMR context:
 * - List notes (paginated/filterable) scoped to provider via Encounter
 * - Create draft note tied to Encounter
 * - Update draft note (autosave)
 * - Finalize note (digital signature), emit event
 *
 * Ownership and RBAC are enforced at controller/route layers; this service performs domain operations.
 */
export class NotesService {
  /**
   * List notes (provider-scoped via Encounter) for a patient with pagination and filters.
   */
  static async list(
    providerId: string,
    patientId: string,
    query: EmrNotesListQuery
  ) {
    return NotesRepository.list(providerId, patientId, query);
  }

  /**
   * Create a new draft ProgressNote tied to Encounter.
   * Caller must validate payload using Zod (ProgressNoteDraftCreateSchema) before invoking.
   */
  static async createDraft(params: {
    encounterId: string;
    patientId: string;
    authorId: string; // typically providerId
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    summary?: string | null;
    attachments?: any | null;
  }) {
    // Ensure encounter exists and belongs to provider and patient for integrity
    const enc = await prisma.encounter.findUnique({
      where: { id: params.encounterId },
      select: { id: true, providerId: true, patientId: true },
    });
    if (!enc) {
      throw Object.assign(new Error('Encounter not found'), { status: 404 });
    }
    if (enc.patientId !== params.patientId) {
      throw Object.assign(new Error('Patient mismatch for encounter'), { status: 409 });
    }

    // Create draft note via repository to standardize selection and ISO formatting
    const created = await NotesRepository.createDraft(params);
    return { note: created };
  }

  /**
   * Update a draft ProgressNote (autosave semantics).
   * Rejects updates on finalized notes; caller should perform ownership checks.
   */
  static async updateDraft(noteId: string, fields: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    summary?: string | null;
    attachments?: any | null;
  }) {
    // Verify not finalized
    const existing = await NotesRepository.getWithOwnership(noteId);
    if (!existing) {
      throw Object.assign(new Error('Progress note not found'), { status: 404 });
    }
    if (existing.status === 'finalized' || existing.finalizedAt) {
      throw Object.assign(new Error('Finalized notes are immutable; use amendment flow'), { status: 409 });
    }

    const updated = await NotesRepository.updateDraft(noteId, fields);
    return { note: updated };
  }

  /**
   * Finalize a ProgressNote with a digital signature and timestamp.
   * Emits note.finalized domain event. Caller must validate RBAC and ownership.
   */
  static async finalize(noteId: string, params: {
    signatureHash: string;
    finalizedAt?: string; // ISO date string
  }) {
    const existing = await NotesRepository.getWithOwnership(noteId);
    if (!existing) {
      throw Object.assign(new Error('Progress note not found'), { status: 404 });
    }
    if (existing.status === 'finalized' || existing.finalizedAt) {
      throw Object.assign(new Error('Note already finalized'), { status: 409 });
    }

    const finalizedTime = params.finalizedAt ? new Date(params.finalizedAt) : new Date();

    const updated = await prisma.progressNote.update({
      where: { id: noteId },
      data: {
        status: 'finalized' as any,
        signatureHash: params.signatureHash,
        finalizedAt: finalizedTime,
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        authorId: true,
        status: true,
        finalizedAt: true,
        signatureHash: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Emit event
    emitNoteFinalized({
      noteId: updated.id,
      encounterId: updated.encounterId ?? undefined,
      patientId: updated.patientId,
      authorId: updated.authorId,
      finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : finalizedTime.toISOString(),
      signatureHash: updated.signatureHash ?? undefined,
    });

    return {
      note: {
        ...updated,
        finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : finalizedTime.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }
}