import { z } from 'zod';
import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api/response';

/**
 * Centralized validation helpers for API routes.
 * - Uses Zod for all schema validation
 * - Returns uniform error responses without leaking sensitive data (PHI)
 * - Always prefer parse (throws) + catch to avoid partial reads of the body
 *
 * Security:
 * - Never include raw request bodies or secrets in error responses
 * - Ensure schemas are strict and do not coerce unless intentional
 */

// Validate and parse JSON request body using a Zod schema
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: Response }> {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    return { data };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      // Provide detailed validation issues without echoing payload
      return {
        error: errorResponse('Validation failed', 400, {
          errors: error.errors,
        }),
      };
    }
    // Fallback for non-JSON bodies or malformed streams
    return { error: errorResponse('Invalid request body', 400) };
  }
}

// Validate and parse query string parameters against a Zod schema
export function validateQuery<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): { data: T } | { error: Response } {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const data = schema.parse(query);
    return { data };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        error: errorResponse('Invalid query parameters', 400, {
          errors: error.errors,
        }),
      };
    }
    return { error: errorResponse('Invalid request', 400) };
  }
}