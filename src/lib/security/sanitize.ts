/**
 * Sanitization utilities for user-generated content, filenames, and patterns.
 * - Uses isomorphic-dompurify to sanitize HTML on both server and client.
 * - Restricts allowed tags/attrs for rich text fields.
 * - Provides filename sanitization to prevent directory traversal.
 * - Escapes SQL-like patterns for safe use in LIKE queries.
 */
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML content (for rich text notes, messages).
// Security: Allow only basic formatting tags; no scripts/styles/iframes.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: [],
  });
}

// Strip all HTML tags, returning plain text.
// Security: Useful before rendering untrusted content in non-rich contexts.
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Sanitize filename to prevent directory traversal and unsafe characters.
// Security:
// - Removes path separators
// - Collapses repeated dots to a single dot
// - Replaces disallowed characters with underscores
// - Trims leading dots to avoid hidden/system files
// - Limits to 255 characters (common FS limit)
export function sanitizeFilename(filename: string): string {
  const base = String(filename ?? '').trim();
  if (!base) return 'file';
  // Replace path separators
  let safe = base.replace(/[\/\\]/g, '_');
  // Replace any unacceptable characters with underscore (keep alnum, dot, dash, underscore)
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Collapse sequences of multiple dots
  safe = safe.replace(/\.\.+/g, '.');
  // Remove leading dots
  safe = safe.replace(/^\.+/, '');
  // Fallback if empty after cleaning
  if (!safe) safe = 'file';
  // Truncate to 255 chars
  return safe.substring(0, 255);
}

// Escape SQL LIKE pattern metacharacters for safe parameterized usage.
// Security: Always use parameterized queries; this only escapes LIKE wildcards.
// Escapes: backslash (\), percent (%), underscore (_).
export function escapeLikePattern(pattern: string): string {
  const s = String(pattern ?? '');
  return s.replace(/[\\%_]/g, '\\$&');
}

// Additional helper: sanitize text to plain string with trimmed whitespace.
export function sanitizeText(input: string | undefined | null): string {
  const s = String(input ?? '').trim();
  // Remove any stray control characters
  return s.replace(/[\u0000-\u001F\u007F]/g, '');
}