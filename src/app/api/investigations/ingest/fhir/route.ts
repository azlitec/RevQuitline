import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  audit,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';
import {
  requirePermission,
  toProblemJson,
} from '@/lib/api/guard';

/**
 * FHIR Observation Ingestion
 * POST /api/investigations/ingest/fhir
 *
 * Ingests structured lab/diagnostic results (FHIR Observation JSON).
 * - Validates minimal input
 * - Attempts to reconcile to an existing InvestigationOrder or creates one
 * - Creates InvestigationResult with structured fields and full fhirObservation payload
 * - Marks result unreviewed; reviewer workflow handled in review endpoint
 *
 * RBAC:
 * - Requires 'investigation.create'
 *
 * Audit:
 * - Writes 'create' audit logs with source='integration' for each result
 * - Includes provenance metadata
 *
 * Notes:
 * - This endpoint accepts a batch of Observations tied to the same patient (and optional encounter/order/provider).
 * - Error queue/retry strategy can be added by persisting failures into a dedicated table; for now, errors are returned
 *   and logged without aborting the entire batch.
 */

// ===== Zod Schema =====
const FhirIngestSchema = z.object({
  patientId: z.string().min(1),
  providerId: z.string().optional(),
  encounterId: z.string().optional(),
  orderId: z.string().optional(),
  observations: z.array(z.any()).min(1),
});

// ===== Helpers: FHIR mapping =====

type ParsedObservation = {
  code?: string | null;
  name?: string | null;
  value?: string | null;
  units?: string | null;
  referenceRangeLow?: number | null;
  referenceRangeHigh?: number | null;
  referenceRangeText?: string | null;
  interpretation?: 'normal' | 'abnormal' | 'critical' | null;
  performer?: string | null;
  observedAt?: Date | null;
  fhirObservation: any;
};

function safeGetCodeAndDisplay(obs: any): { code?: string | null; display?: string | null } {
  const coding = obs?.code?.coding;
  if (Array.isArray(coding) && coding.length > 0) {
    const c0 = coding[0];
    return {
      code: c0?.code ?? null,
      display: c0?.display ?? obs?.code?.text ?? null,
    };
  }
  return {
    code: undefined,
    display: obs?.code?.text ?? null,
  };
}

function extractValue(obs: any): { value?: string | null; units?: string | null } {
  if (obs?.valueQuantity) {
    const v = obs.valueQuantity;
    const val = v?.value != null ? String(v.value) : null;
    const unit = v?.unit ?? v?.code ?? null;
    return { value: val, units: unit };
  }
  if (typeof obs?.valueString === 'string') {
    return { value: obs.valueString, units: null };
  }
  if (typeof obs?.valueInteger === 'number') {
    return { value: String(obs.valueInteger), units: null };
  }
  if (typeof obs?.valueBoolean === 'boolean') {
    return { value: obs.valueBoolean ? 'true' : 'false', units: null };
  }
  if (obs?.valueCodeableConcept?.text) {
    return { value: obs.valueCodeableConcept.text, units: null };
  }
  return { value: null, units: null };
}

function extractReferenceRange(obs: any): {
  low?: number | null;
  high?: number | null;
  text?: string | null;
} {
  const rr = Array.isArray(obs?.referenceRange) ? obs.referenceRange[0] : undefined;
  const low = rr?.low?.value != null ? Number(rr.low.value) : null;
  const high = rr?.high?.value != null ? Number(rr.high.value) : null;
  const text = rr?.text ?? null;
  return { low, high, text };
}

function mapInterpretation(obs: any): 'normal' | 'abnormal' | 'critical' | null {
  // FHIR Observation.interpretation is CodeableConcept[]; codes vary (N, A, H, L, HH, LL, CRIT, etc.)
  const cc = Array.isArray(obs?.interpretation) ? obs.interpretation[0] : undefined;
  const coding = Array.isArray(cc?.coding) && cc.coding.length > 0 ? cc.coding[0] : undefined;
  const code: string | undefined = coding?.code ?? undefined;
  const text: string | undefined = cc?.text ?? undefined;
  const norm = (code || text || '').toString().toUpperCase();

  // Common mappings
  if (norm === 'N' || /NORMAL/.test(norm)) return 'normal';
  if (['A', 'AB', 'H', 'L', 'HIGH', 'LOW', 'ABNORMAL'].some((k) => norm.includes(k))) return 'abnormal';
  if (['HH', 'LL', 'CRIT', 'CRITICAL', 'PANIC'].some((k) => norm.includes(k))) return 'critical';
  return null;
}

function extractPerformer(obs: any): string | null {
  const perf = Array.isArray(obs?.performer) ? obs.performer[0] : undefined;
  // performer can be Reference to Organization/Practitioner; use display when available
  return perf?.display ?? null;
}

function extractObservedAt(obs: any): Date | null {
  const dt = obs?.effectiveDateTime ?? obs?.issued ?? obs?.meta?.lastUpdated;
  if (dt) {
    const d = new Date(dt);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseObservation(obs: any): ParsedObservation {
  const { code, display } = safeGetCodeAndDisplay(obs);
  const { value, units } = extractValue(obs);
  const { low, high, text } = extractReferenceRange(obs);
  const interpretation = mapInterpretation(obs);
  const performer = extractPerformer(obs);
  const observedAt = extractObservedAt(obs);

  return {
    code: code ?? null,
    name: display ?? null,
    value: value ?? null,
    units: units ?? null,
    referenceRangeLow: low ?? null,
    referenceRangeHigh: high ?? null,
    referenceRangeText: text ?? null,
    interpretation,
    performer,
    observedAt: observedAt ?? null,
    fhirObservation: obs,
  };
}

async function findOrCreateOrder(params: {
  patientId: string;
  providerId?: string | null;
  encounterId?: string | null;
  preferredOrderId?: string | null;
  parsed: ParsedObservation;
}) {
  const { patientId, providerId, encounterId, preferredOrderId, parsed } = params;

  if (preferredOrderId) {
    const existing = await prisma.investigationOrder.findUnique({ where: { id: preferredOrderId } });
    if (existing) return existing.id;
  }

  // Try to reconcile by patient + code/name and recent orderedAt
  const name = parsed.name ?? undefined;
  const code = parsed.code ?? undefined;

  const where: any = {
    patientId,
  };
  if (code || name) {
    where.OR = [
      ...(code ? [{ code: code }] : []),
      ...(name ? [{ name: name }] : []),
    ];
  }

  const recent = await prisma.investigationOrder.findFirst({
    where,
    orderBy: { orderedAt: 'desc' },
    select: { id: true },
  });
  if (recent) return recent.id;

  // Create a new order if none matches; require some providerId
  const prov = providerId ?? null;
  const created = await prisma.investigationOrder.create({
    data: {
      patientId,
      providerId: prov ?? (patientId ? 'unknown-provider' : 'unknown-provider'), // fallback; ideally from session
      encounterId: encounterId ?? null,
      code: code ?? null,
      name: name ?? parsed.code ?? 'Observation',
      status: 'completed' as any, // since result being ingested
      orderedAt: parsed.observedAt ?? new Date(),
      notes: 'Auto-created by FHIR ingestion',
    },
    select: { id: true },
  });
  return created.id;
}

function getRetryDelayMs(retryCount: number): number {
  const base = 15 * 60 * 1000; // 15 minutes
  const capped = Math.min(retryCount, 5);
  return base * Math.pow(2, capped); // 15m, 30m, 60m, 120m, 240m, 480m
}

// ===== Handler =====

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'investigation.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = FhirIngestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const results: Array<{ observationIndex: number; resultId: string; orderId: string }> = [];
    const errors: Array<{ observationIndex: number; error: string }> = [];

    // Ingest sequentially to simplify error handling and auditing
    for (let i = 0; i < body.observations.length; i++) {
      const raw = body.observations[i];
      try {
        const po = parseObservation(raw);

        const orderId = await findOrCreateOrder({
          patientId: body.patientId,
          providerId: body.providerId ?? (session.user?.id ?? null),
          encounterId: body.encounterId ?? null,
          preferredOrderId: body.orderId ?? null,
          parsed: po,
        });

        const created = await prisma.investigationResult.create({
          data: {
            orderId,
            code: po.code ?? null,
            name: po.name ?? null,
            value: po.value ?? null,
            units: po.units ?? null,
            referenceRangeLow: po.referenceRangeLow ?? null,
            referenceRangeHigh: po.referenceRangeHigh ?? null,
            referenceRangeText: po.referenceRangeText ?? null,
            interpretation: (po.interpretation as any) ?? null,
            performer: po.performer ?? null,
            observedAt: po.observedAt ?? new Date(),
            fhirObservation: po.fhirObservation as any,
            // attachments: not from FHIR Observation by default
          },
          select: { id: true, orderId: true },
        });

        // Audit with source='integration'
        await audit(
          request,
          session,
          'create',
          'investigation_result',
          created.id,
          {
            source: 'integration',
            metadata: buildProvenanceMetadata(session, {
              orderId: created.orderId,
              observationIndex: i,
              code: po.code,
              name: po.name,
              interpretation: po.interpretation,
            }),
          }
        );

        results.push({ observationIndex: i, resultId: created.id, orderId: created.orderId });
      } catch (e: any) {
        console.error('[FHIR Ingest] Error processing observation', { index: i, error: e });
        // Enqueue integration error for retry processing
        try {
          await (prisma as any).integrationError.create({
            data: {
              patientId: body.patientId,
              orderId: body.orderId ?? null,
              entityType: 'investigation_result',
              source: 'fhir',
              payload: raw as any,
              errorMessage: e?.message ?? 'Unknown error',
              retryCount: 0,
              nextRetryAt: new Date(Date.now() + getRetryDelayMs(0)),
            },
          });
        } catch (queueErr: any) {
          console.error('[FHIR Ingest] Failed to enqueue IntegrationError', { index: i, error: queueErr });
        }
        errors.push({ observationIndex: i, error: e?.message ?? 'Unknown error' });
        // Continue processing remaining observations
      }
    }

    const status = errors.length > 0 ? 207 : 201; // 207 Multi-Status if partial failures
    return NextResponse.json(
      {
        createdCount: results.length,
        errorCount: errors.length,
        results,
        errors,
      },
      { status }
    );
  } catch (err: any) {
    console.error('[Investigations FHIR Ingest POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to ingest FHIR Observations', status }), issues },
      { status }
    );
  }
}