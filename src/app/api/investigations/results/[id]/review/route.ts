import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { auditReview, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission, toProblemJson } from '@/lib/api/guard';

/**
 * Review Investigation Result
 * PATCH /api/investigations/results/[id]/review
 *
 * Marks a result as reviewed with reviewer and timestamp for compliance and safety workflows.
 *
 * RBAC:
 * - Requires 'investigation.review'
 *
 * Audit:
 * - Writes a 'review' audit log with provenance (user, IP, timestamp)
 */

// Optional payload: allow toggling reviewed flag; default to true.
// reviewedAt can be supplied (ISO) but will default to server time; reviewerId is derived from session.
const ReviewPatchSchema = z.object({
  reviewed: z.coerce.boolean().default(true),
  reviewedAt: z.string().datetime().optional(),
});

function getResultIdFromUrl(req: NextRequest): string | null {
  try {
    const url = new URL(req.url);
    const m = url.pathname.match(/\/api\/investigations\/results\/([^/]+)\/review\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'investigation.review');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const resultId = getResultIdFromUrl(request);
    if (!resultId) {
      return NextResponse.json(
        { error: 'Invalid URL. Missing result id.' },
        { status: 400 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = ReviewPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.investigationResult.findUnique({
      where: { id: resultId },
      select: {
        id: true,
        orderId: true,
        reviewed: true,
        reviewerId: true,
        reviewedAt: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Investigation result not found' }, { status: 404 });
    }

    // Idempotent behavior: if already reviewed and body.reviewed=true, return current state
    const targetReviewed = body.reviewed;
    let reviewedAtDate: Date | null = null;
    if (targetReviewed) {
      reviewedAtDate = body.reviewedAt ? new Date(body.reviewedAt) : new Date();
    }

    const updated = await prisma.investigationResult.update({
      where: { id: resultId },
      data: {
        reviewed: targetReviewed,
        reviewerId: targetReviewed ? session.user.id : null,
        reviewedAt: targetReviewed ? reviewedAtDate : null,
      },
      select: {
        id: true,
        orderId: true,
        code: true,
        name: true,
        value: true,
        units: true,
        referenceRangeLow: true,
        referenceRangeHigh: true,
        referenceRangeText: true,
        interpretation: true,
        performer: true,
        observedAt: true,
        reviewed: true,
        reviewerId: true,
        reviewedAt: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditReview(
      request,
      session,
      'investigation_result',
      updated.id,
      buildProvenanceMetadata(session, {
        orderId: updated.orderId,
        reviewed: updated.reviewed,
        reviewerId: updated.reviewerId,
        reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      })
    );

    return NextResponse.json(
      {
        result: {
          ...updated,
          code: updated.code ?? null,
          name: updated.name ?? null,
          referenceRangeLow: updated.referenceRangeLow ?? null,
          referenceRangeHigh: updated.referenceRangeHigh ?? null,
          referenceRangeText: updated.referenceRangeText ?? null,
          interpretation: updated.interpretation ?? null,
          performer: updated.performer ?? null,
          observedAt: updated.observedAt ? updated.observedAt.toISOString() : null,
          reviewerId: updated.reviewerId ?? null,
          reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[InvestigationResults REVIEW PATCH] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to review investigation result', status }), issues },
      { status }
    );
  }
}