import { NextRequest, NextResponse } from 'next/server';
import { toProblemJson } from '@/lib/api/guard';
import { randomUUID } from 'crypto';

/**
 * Standardized API response helpers for EMR endpoints:
 * - Enforces Cache-Control: no-store for privacy
 * - Attaches requestId/correlationId to responses
 * - Provides uniform envelopes:
 *   - List: { success: true, data: { items, total, page, pageSize }, requestId }
 *   - Entity: { success: true, data, requestId }
 *   - Error: RFC7807 Problem+JSON + requestId
 *
 * Usage:
 *   return jsonList(req, { items, total, page, pageSize }, 200);
 *   return jsonEntity(req, payload, 201);
 *   return jsonError(req, err, { title: 'Failed', status: 400 });
 */

function getRequestId(req: NextRequest): string {
  const hdr = req.headers;
  const rid = hdr.get('x-request-id') || hdr.get('x-correlation-id');
  return rid ?? randomUUID();
}

function defaultHeaders(requestId: string): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    'Pragma': 'no-cache',
    'x-request-id': requestId,
  };
}

/**
 * List envelope
 */
export function jsonList(
  req: NextRequest,
  params: { items: any[]; total: number; page: number; pageSize: number },
  status = 200
) {
  const requestId = getRequestId(req);
  return NextResponse.json(
    { success: true, data: { ...params }, requestId },
    { status, headers: defaultHeaders(requestId) }
  );
}

/**
 * Entity envelope
 */
export function jsonEntity(
  req: NextRequest,
  entity: unknown,
  status = 200
) {
  const requestId = getRequestId(req);
  return NextResponse.json(
    { success: true, data: entity, requestId },
    { status, headers: defaultHeaders(requestId) }
  );
}

/**
 * Problem+JSON error with consistent headers and requestId
 */
export function jsonError(
  req: NextRequest,
  err: unknown,
  defaults?: { title?: string; status?: number }
) {
  const requestId = getRequestId(req);
  const problem = toProblemJson(err, defaults);
  // attach requestId without leaking PHI
  (problem as any).requestId = requestId;
  const status = (problem as any).status ?? 500;
  return NextResponse.json(problem, {
    status,
    headers: defaultHeaders(requestId),
  });
}
/**
 * Generic errorResponse helper for uniform RFC7807 error payloads.
 * - Avoids PHI leakage by limiting fields to title/status/detail + optional extras
 * - Attaches a server-generated requestId when none is provided
 * - Applies privacy-preserving headers (Cache-Control: no-store)
 *
 * Usage:
 *   return errorResponse('Validation failed', 400, { errors });
 *   return errorResponse('Invalid request body', 400);
 *
 * Security note:
 * - Do not pass raw exception objects as extras; only sanitized metadata such as validation issues.
 * - Maintain minimal detail messages; use logs for internal diagnostics (without secrets).
 */
export function errorResponse(
  title: string,
  status = 400,
  extras?: Record<string, unknown>
): Response {
  const requestId = randomUUID();
  const problem: any = {
    type: 'about:blank',
    title,
    status,
    detail: title,
    // Attach requestId for traceability without leaking PHI
    requestId,
  };
  if (extras && typeof extras === 'object') {
    Object.assign(problem, extras);
  }
  return NextResponse.json(problem, {
    status,
    headers: defaultHeaders(requestId),
  });
}