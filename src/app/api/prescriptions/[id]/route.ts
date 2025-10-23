import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { jsonEntity, jsonError } from '@/lib/api/response';
import { requirePermission, parseJson } from '@/lib/api/guard';
import { PrescriptionController } from '@/lib/controllers/prescription.controller';
import { PrescriptionRepository } from '@/lib/repositories/prescription.repo';
import { PrescriptionUpdateSchema } from '@/lib/validators/prescription';
import { auditView, buildProvenanceMetadata } from '@/lib/audit/audit';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CancelSchema = z.object({ reason: z.string().min(3, 'Cancellation reason is required') });

function canView(session: any, p: any): boolean {
  if (!session?.user || !p) return false;
  const uid = session.user.id;
  const role = session.user.role;
  const isOwner = uid === p.patientId || uid === p.providerId;
  const isStaff = role === 'ADMIN' || role === 'CLERK';
  return isOwner || isStaff;
}

/**
 * GET /api/prescriptions/[id]
 * View a single prescription.
 * Authorization: provider owner OR patient owner (admin/clerk allowed).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    const id = params.id;
    if (!id) {
      return jsonError(request, new Error('Prescription id is required'), { title: 'Validation error', status: 400 });
    }
    const p = await PrescriptionRepository.getPrescriptionById(id);
    if (!p) {
      return jsonError(request, new Error('Prescription not found'), { title: 'Not Found', status: 404 });
    }
    if (!canView(session, p)) {
      return jsonError(request, new Error('Forbidden'), { title: 'Forbidden', status: 403 });
    }
    await auditView(
      request,
      session,
      'user',
      p.id,
      buildProvenanceMetadata(session, {
        entity: 'prescription',
        providerId: p.providerId,
        patientId: p.patientId,
        action: 'GET',
      })
    );
    return jsonEntity(request, { prescription: p }, 200);
  } catch (err: any) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to get prescription', status });
  }
}

/**
 * PATCH /api/prescriptions/[id]
 * Update a prescription (provider/admin).
 * Requires permission: medication.update
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const id = params.id;
    if (!id) {
      return jsonError(request, new Error('Prescription id is required'), { title: 'Validation error', status: 400 });
    }
    const body = await parseJson(request as any, PrescriptionUpdateSchema);
    if (body.id !== id) {
      return jsonError(request, new Error('Body id does not match path id'), { title: 'Validation error', status: 400 });
    }
    const role: 'PROVIDER' | 'ADMIN' = session.user.role === 'ADMIN' ? 'ADMIN' : 'PROVIDER';
    const userId = session.user.id;

    const updated = await PrescriptionController.handleUpdatePrescription(
      request,
      session,
      id,
      userId,
      role,
      body
    );

    return jsonEntity(request, updated, 200);
  } catch (err: any) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to update prescription', status });
  }
}

/**
 * DELETE /api/prescriptions/[id]
 * Cancel a prescription with a reason (provider/admin).
 * Requires permission: medication.update
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    const id = params.id;
    if (!id) {
      return jsonError(request, new Error('Prescription id is required'), { title: 'Validation error', status: 400 });
    }
    // Parse reason from body
    const { reason } = CancelSchema.parse(await request.json().catch(() => ({})));

    const role: 'PROVIDER' | 'ADMIN' = session.user.role === 'ADMIN' ? 'ADMIN' : 'PROVIDER';
    const userId = session.user.id;

    const cancelled = await PrescriptionController.handleCancelPrescription(
      request,
      session,
      id,
      userId,
      role,
      reason
    );

    return jsonEntity(request, cancelled, 200);
  } catch (err: any) {
    const status =
      err?.status && Number.isInteger(err.status) ? err.status : (err?.name === 'ZodError' ? 400 : 500);
    return jsonError(request, err, { title: 'Failed to cancel prescription', status });
  }
}