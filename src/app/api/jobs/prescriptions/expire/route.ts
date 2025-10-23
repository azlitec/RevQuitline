import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { requirePermission } from '@/lib/api/guard';
import { auditUpdate, buildProvenanceMetadata } from '@/lib/audit/audit';
import { PrescriptionRepository } from '@/lib/repositories/prescription.repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Expire Prescriptions Job Route
 * /api/jobs/prescriptions/expire
 *
 * POST: Runs batch job to mark ACTIVE prescriptions whose endDate is in the past as EXPIRED.
 * Authorization: Admin or Clerk with medication.update permission.
 * Audit: Emits job run with updated count and actor.
 */
export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    try {
      requirePermission(session, 'medication.update');
    } catch (err: any) {
      return jsonError(request, err, { title: 'Permission error', status: err?.status ?? 403 });
    }

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'CLERK') {
      return jsonError(request, new Error('Forbidden'), { title: 'Forbidden', status: 403 });
    }

    const updatedCount = await PrescriptionRepository.expirePrescriptions();

    await auditUpdate(
      request,
      session,
      'user',
      'prescriptions_expire_job',
      buildProvenanceMetadata(session, {
        actorUserId: session.user.id,
        role,
        updatedCount,
        entity: 'prescription',
        action: 'JOB_EXPIRE',
      })
    );

    return jsonEntity(request, { updatedCount }, 200);
  } catch (err: any) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to run expiration job', status });
  }
}