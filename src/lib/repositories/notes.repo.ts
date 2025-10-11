import { prisma } from '@/lib/db';
import type { EmrNotesListQuery } from '@/lib/validators/emr';

export class NotesRepository {
  /**
   * List progress notes for a provider↔patient context with pagination and optional filters.
   * - Filters: encounterId, status, keywords (search across SOAP and summary)
   * - Scoping: notes must belong to the patient AND their encounter must belong to provider
   */
  static async list(
    providerId: string,
    patientId: string,
    query: EmrNotesListQuery
  ): Promise<{
    items: Array<{
      id: string;
      encounterId: string | null;
      patientId: string;
      authorId: string;
      status: string;
      subjective: string | null;
      objective: string | null;
      assessment: string | null;
      plan: string | null;
      summary: string | null;
      autosavedAt: string | null;
      finalizedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize, encounterId, status, keywords } = query;

    const where: any = {
      patientId,
      encounter: {
        // Scope by provider via encounter
        providerId,
      },
    };
    if (encounterId) where.encounterId = encounterId;
    if (status) where.status = status;

    if (keywords && keywords.trim().length > 0) {
      const kw = keywords.trim();
      where.OR = [
        { subjective: { contains: kw, mode: 'insensitive' } },
        { objective: { contains: kw, mode: 'insensitive' } },
        { assessment: { contains: kw, mode: 'insensitive' } },
        { plan: { contains: kw, mode: 'insensitive' } },
        { summary: { contains: kw, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.progressNote.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          encounterId: true,
          patientId: true,
          authorId: true,
          status: true,
          subjective: true,
          objective: true,
          assessment: true,
          plan: true,
          summary: true,
          autosavedAt: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.progressNote.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        encounterId: n.encounterId,
        patientId: n.patientId,
        authorId: n.authorId,
        status: n.status,
        subjective: n.subjective ?? null,
        objective: n.objective ?? null,
        assessment: n.assessment ?? null,
        plan: n.plan ?? null,
        summary: n.summary ?? null,
        autosavedAt: n.autosavedAt ? n.autosavedAt.toISOString() : null,
        finalizedAt: n.finalizedAt ? n.finalizedAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Fetch note with encounter provider for ownership/security checks.
   */
  static async getWithOwnership(noteId: string) {
    return prisma.progressNote.findUnique({
      where: { id: noteId },
      select: {
        id: true,
        patientId: true,
        authorId: true,
        status: true,
        finalizedAt: true,
        encounter: { select: { id: true, providerId: true } },
      },
    });
  }

  /**
   * Create draft note.
   */
  static async createDraft(params: {
    encounterId: string;
    patientId: string;
    authorId: string;
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    summary?: string | null;
    attachments?: any | null;
  }) {
    const created = await prisma.progressNote.create({
      data: {
        encounterId: params.encounterId,
        patientId: params.patientId,
        authorId: params.authorId,
        status: 'draft' as any,
        subjective: params.subjective ?? null,
        objective: params.objective ?? null,
        assessment: params.assessment ?? null,
        plan: params.plan ?? null,
        summary: params.summary ?? null,
        attachments: params.attachments ?? null,
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        authorId: true,
        status: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        summary: true,
        autosavedAt: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...created,
      autosavedAt: created.autosavedAt ? created.autosavedAt.toISOString() : null,
      finalizedAt: created.finalizedAt ? created.finalizedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update draft note (autosave). Does not allow updates to finalized notes; the service enforces this prior to call.
   */
  static async updateDraft(noteId: string, fields: {
    subjective?: string | null;
    objective?: string | null;
    assessment?: string | null;
    plan?: string | null;
    summary?: string | null;
    attachments?: any | null;
  }) {
    const updated = await prisma.progressNote.update({
      where: { id: noteId },
      data: {
        subjective: fields.subjective ?? undefined,
        objective: fields.objective ?? undefined,
        assessment: fields.assessment ?? undefined,
        plan: fields.plan ?? undefined,
        summary: fields.summary ?? undefined,
        attachments: fields.attachments ?? undefined,
        autosavedAt: new Date(),
      },
      select: {
        id: true,
        encounterId: true,
        patientId: true,
        authorId: true,
        status: true,
        subjective: true,
        objective: true,
        assessment: true,
        plan: true,
        summary: true,
        autosavedAt: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      autosavedAt: updated.autosavedAt ? updated.autosavedAt.toISOString() : null,
      finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}