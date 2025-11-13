import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { jsonError } from '@/lib/api/response';
import { PrescriptionRepository } from '@/lib/repositories/prescription.repo';
import { PrescriptionService } from '@/lib/services/prescription.service';
import { auditView, buildProvenanceMetadata } from '@/lib/audit/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function canView(session: any, p: any): boolean {
  if (!session?.user || !p) return false;
  const uid = session.user.id;
  const role = session.user.role;
  const isOwner = uid === p.patientId || uid === p.providerId;
  const isStaff = role === 'ADMIN' || role === 'CLERK';
  return isOwner || isStaff;
}

/**
 * GET /api/prescriptions/[id]/print
 * Streams a printable HTML "PDF" (HTML content to print/save as PDF) for a prescription.
 * Authorization: provider owner OR patient owner (admin/clerk allowed).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return jsonError(request, new Error('Unauthorized'), { title: 'Unauthorized', status: 401 });
    }
    const { id: id } = await params;
    if (!id) {
      return jsonError(request, new Error('Prescription id is required'), { title: 'Validation error', status: 400 });
    }

    // Verify ownership before generating
    const p = await PrescriptionRepository.getPrescriptionById(id);
    if (!p) {
      return jsonError(request, new Error('Prescription not found'), { title: 'Not Found', status: 404 });
    }
    if (!canView(session, p)) {
      return jsonError(request, new Error('Forbidden'), { title: 'Forbidden', status: 403 });
    }

    const file = await PrescriptionService.generatePrescriptionPDF(id);

    await auditView(
      request,
      session,
      'user',
      id,
      buildProvenanceMetadata(session, {
        entity: 'prescription',
        action: 'PRINT',
        providerId: p.providerId,
        patientId: p.patientId,
      })
    );

    // Stream HTML back; browser can print/save as PDF
    const headers = new Headers();
    headers.set('Content-Type', file.contentType);
    headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
    headers.set('Cache-Control', 'no-store');
    headers.set('Pragma', 'no-cache');

    return new Response(file.content, { status: 200, headers });
  } catch (err: any) {
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return jsonError(request, err, { title: 'Failed to generate prescription PDF', status });
  }
}