import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { requirePermission, ensureProviderPatientLink } from '@/lib/api/guard';
import { EmrSummaryQuerySchema } from '@/lib/validators/emr';
import { EmrController } from '@/lib/controllers/emr.controller';
import { jsonEntity, jsonError } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Provider EMR Summary Route
 * GET /api/provider/patients/{patientId}/emr
 *
 * Provides a lightweight EMR summary for a provider↔patient context:
 * - Counters: draft notes, abnormal results, unsent correspondence, upcoming appts, last visit, total visits
 * - Links: consultations, notes, prescriptions subresources
 * - Optional expansions: include=consultations,notes,prescriptions (small previews)
 *
 * Guards:
 * - Session with provider role
 * - Permission: encounter.read
 * - Approved provider↔patient link required
 *
 * Errors:
 * - RFC7807 Problem+JSON via toProblemJson()
 */

// Parse query params for EMR summary (currently only include CSV)
function parseQuery(req: NextRequest): { include?: string } {
  const sp = new URL(req.url).searchParams;
  const obj = {
    include: sp.get('include') ?? undefined,
  };
  const parsed = EmrSummaryQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }

    // RBAC: encounter.read required
    try {
      requirePermission(session, 'encounter.read');
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return jsonError(request, new Error('Patient ID is required'), { title: 'Validation error', status: 400 });
    }

    // Ensure approved provider↔patient link
    try {
      await ensureProviderPatientLink(session, patientId);
    } catch (err: any) {
      return jsonError(request, err, { title: 'Access denied', status: err?.status ?? 403 });
    }

    const { include } = parseQuery(request);

    // Build EMR summary via controller (handles audit)
    const providerId = session.user.id;
    const summary = await EmrController.getSummary(
      request,
      session,
      providerId,
      patientId,
      include || undefined
    );

    return jsonEntity(request, summary, 200);
  } catch (err: any) {
    console.error('[EMR Summary GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return jsonError(request, err, { title: 'Failed to get EMR summary', status });
  }
}