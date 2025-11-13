import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import {
  requirePermission,
  ensureProviderPatientLink,
  parseJson,
} from '@/lib/api/guard';
import { ProgressNoteFinalizeSchema } from '@/lib/api/guard';
import { NotesController } from '@/lib/controllers/notes.controller';
import { jsonEntity, jsonError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider EMR Notes Finalize Route
 * POST /api/provider/patients/{patientId}/emr/notes/finalize
 *
 * Finalize a ProgressNote (SOAP) in the context of a provider↔patient EMR:
 * - Locks content
 * - Records digital signature
 * - Emits note.finalized event
 *
 * Guards:
 * - progress_note.finalize permission with approved provider requirement
 * - Approved provider↔patient link
 * - Ownership checks enforced in NotesController.finalize()
 *
 * Errors:
 * - RFC7807 Problem+JSON via toProblemJson()
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC: require finalize permission, and approved provider
    try {
      requirePermission(session, 'progress_note.finalize', { requireApprovedProvider: true });
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const { patientId: patientId } = await params;
    if (!patientId) {
      return jsonError(request, new Error('Patient ID is required'), { title: 'Validation error', status: 400 });
    }

    // Ensure provider↔patient link
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    // Validate payload
    const body = await parseJson(request as any, ProgressNoteFinalizeSchema);
    const providerId = session.user.id;

    // Finalize via controller (performs ownership checks, audit, event emission)
    const finalized = await NotesController.finalize(
      request,
      session,
      providerId,
      patientId,
      body
    );

    return jsonEntity(request, finalized, 200);
  } catch (err: any) {
    console.error('[EMR Notes Finalize POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return jsonError(request, err, { title: 'Failed to finalize note', status });
  }
}