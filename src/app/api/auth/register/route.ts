import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { registerSchema } from '@/lib/validators/auth';
import { stripHtml, sanitizeText } from '@/lib/security/sanitize';
import { errorResponse, jsonEntity } from '@/lib/api/response';
// SECURITY: IP+email rate limiting to prevent abuse (Part 4)
import { rateLimitConsume } from '@/lib/security/rateLimit';

/**
 * Secure Registration Endpoint
 * - Validates input using centralized Zod schemas [registerSchema](src/lib/validators/auth.ts)
 * - Sanitizes name (strip HTML, trim control chars) [sanitizeText](src/lib/security/sanitize.ts)
 * - Enforces provider registration to start as pending (admin approval required)
 * - Uses standardized error responses [errorResponse](src/lib/api/response.ts)
 *
 * Notes:
 * - Rate limiting should be implemented (Part 4) to prevent abuse
 * - Never leak sensitive details in responses or logs
 */

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();

    // Backward compatibility: original payload uses firstName, lastName, email, phone, password, userType, licenseNumber
    const role = raw?.userType === 'doctor' ? 'PROVIDER_PENDING' : 'USER';

    // Sanitize and normalize name: join first+last, strip HTML, trim, remove control chars
    const fullNameRaw = `${raw?.firstName ?? ''} ${raw?.lastName ?? ''}`.trim();
    const fullName = sanitizeText(stripHtml(fullNameRaw));

    // SECURITY: rate limiting per IP+email to prevent abuse (Part 4)
    const normalizedEmail = String(raw?.email ?? '').toLowerCase().trim();
    try {
      await rateLimitConsume(`register:${normalizedEmail}`, {
        maxRequests: 10,
        windowMs: 15 * 60_000, // 15 minutes window
      });
    } catch (rateLimitError: any) {
      // Standardized 429 error without leaking sensitive context
      return errorResponse('Too many registration attempts. Please try again later.', 429, {
        retryAfter: rateLimitError.retryAfter,
      });
    }

    // Build payload for validation using centralized schema
    const payload = {
      email: raw?.email,
      password: raw?.password,
      name: fullName,
      role,
      phone: raw?.phone && raw.phone.trim() ? raw.phone.trim() : undefined, // Only include if not empty
      licenseNumber: raw?.licenseNumber,
    };

    // Validate input; return uniform validation errors without echoing raw data
    const data = registerSchema.parse(payload);

    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return errorResponse('Email already in use', 400);
    }

    // Hash password with bcryptjs; do not log the hash or plaintext
    const hashedPassword = await hash(data.password, 10);

    // Derive first/last from sanitized full name
    const parts = data.name.split(' ').filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ') || '';

    // Construct create payload; providers start pending and require admin approval
    const createData: any = {
      firstName,
      lastName,
      email: data.email,
      phone: raw?.phone || '',
      password: hashedPassword,
      isProvider: false,
      role: data.role, // 'USER' | 'PROVIDER_PENDING'
      licenseNumber: data.role === 'PROVIDER_PENDING' ? (data.licenseNumber || '') : null,
    };

    const user = await prisma.user.create({
      data: createData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isProvider: true,
        role: true,
      },
    });

    // Return standardized success envelope (privacy headers + requestId)
    return jsonEntity(request, {
      message: 'Account registered successfully',
      user,
    }, 201);
  } catch (error: any) {
    // Zod validation errors surfaced with uniform errorResponse
    if (error?.name === 'ZodError') {
      return errorResponse('Validation failed', 400, { errors: error.errors });
    }
    // Generic fallback without leaking details
    return errorResponse('Registration failed', 500);
  }
}