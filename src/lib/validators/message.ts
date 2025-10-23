/**
 * Message validators and sanitization.
 * Security goals:
 * - Enforce length limits (max 5000 chars)
 * - Sanitize HTML content to strip dangerous tags/attrs
 * - Validate IDs and optional thread references
 */
import { z } from 'zod';
import { sanitizeHtml } from '@/lib/security/sanitize';

export const CONTENT_MAX_LENGTH = 5000;

/**
 * Generic message send schema:
 * - recipientId: target user (string ID; route should verify existence and permissions)
 * - content: sanitized rich text (basic formatting only)
 * - threadId: optional message thread for grouping/conversations
 *
 * Content is sanitized at validation-time to ensure downstream consumers only see cleaned HTML.
 */
export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, 'recipientId is required'),
  content: z
    .string()
    .min(1, 'content is required')
    .max(CONTENT_MAX_LENGTH, `content must be at most ${CONTENT_MAX_LENGTH} characters`)
    .transform((s) => sanitizeHtml(s)),
  threadId: z.string().min(1).optional(),
});

/**
 * Patient-facing message schema used by routes that rely on an existing conversationId.
 * - conversationId: required
 * - content: sanitized rich text (basic formatting only)
 */
export const sendPatientMessageSchema = z.object({
  conversationId: z.string().min(1, 'conversationId is required'),
  content: z
    .string()
    .min(1, 'content is required')
    .max(CONTENT_MAX_LENGTH, `content must be at most ${CONTENT_MAX_LENGTH} characters`)
    .transform((s) => sanitizeHtml(s)),
});

// Types
export type SendMessageDTO = z.infer<typeof sendMessageSchema>;
export type SendPatientMessageDTO = z.infer<typeof sendPatientMessageSchema>;