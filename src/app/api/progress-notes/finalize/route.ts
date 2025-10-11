import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { auditFinalize, buildProvenanceMetadata } from '@/lib/audit/audit';
import { emitNoteFinalized } from '@/lib/events/bus';
import {
  ProgressNoteFinalizeSchema,
  parseJson,
  toProblemJson,
  requirePermission,
} from '@/lib/api/guard';

/**
 * POST /api/progress-notes/finalize
 * Finalize a draft ProgressNote: lock content, capture digital signature, emit note.finalized event.
 * RBAC:
 *  - Requires progress_note.finalize permission
 *  - Additionally enforces author/encounter-provider/admin ownership checks
 * Audit:
 *  - Writes auditFinalize with provenance metadata (encounterId, patientId)
 */
export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Role-level permission check
    try {
      requirePermission(session, 'progress_note.finalize', { requireApprovedProvider: true });
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const body = await parseJson(request as any, ProgressNoteFinalizeSchema);
    const { id, signatureHash, finalizedAt } = body;

    // Load note with contextual relations
    const note = await prisma.progressNote.findUnique({
      where: { id },
      include: {
        encounter: {
          select: {
            id: true,
            providerId: true,
            patientId: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Progress note not found' }, { status: 404 });
    }

    // Enforce immutability rules and valid transitions
    if (note.status === 'finalized' || note.finalizedAt) {
      return NextResponse.json(
        { error: 'Note already finalized' },
        { status: 409 }
      );
    }
    if (note.status === 'amended') {
      return NextResponse.json(
        { error: 'Amended notes cannot be finalized' },
        { status: 409 }
      );
    }

    // Ownership: author OR encounter provider OR admin
    const userId = session.user.id;
    const isAuthor = note.authorId === userId;
    const isEncounterProvider = note.encounter?.providerId === userId;
    const isAdmin = session.user.isAdmin === true;

    if (!isAuthor && !isEncounterProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: not author or encounter provider' },
        { status: 403 }
      );
    }

    // Finalize
    const finalizedTime = finalizedAt ? new Date(finalizedAt) : new Date();
    const updated = await prisma.progressNote.update({
      where: { id: note.id },
      data: {
        status: 'finalized' as any, // Prisma enum ProgressNoteStatus
        signatureHash,
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

    // Audit
    await auditFinalize(
      request,
      session,
      'progress_note',
      updated.id,
      buildProvenanceMetadata(session, {
        encounterId: updated.encounterId,
        patientId: updated.patientId,
      })
    );

    // Emit domain event
    emitNoteFinalized({
      noteId: updated.id,
      encounterId: updated.encounterId ?? undefined,
      patientId: updated.patientId,
      authorId: updated.authorId,
      finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : finalizedTime.toISOString(),
      signatureHash: updated.signatureHash ?? undefined,
    });

    return NextResponse.json(
      {
        note: {
          ...updated,
          finalizedAt: updated.finalizedAt ? updated.finalizedAt.toISOString() : finalizedTime.toISOString(),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Finalize ProgressNote] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Finalize failed', status }),
      { status }
    );
  }
}