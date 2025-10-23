/**
 * File upload validation utilities.
 * Security goals:
 * - Enforce MIME type allowlist
 * - Enforce max size
 * - Verify magic bytes (actual file signature) match claimed type
 * - Basic content scan for common malicious patterns
 *
 * Note:
 * - Always generate a random server-side filename (never trust client filename).
 * - Store files outside of webroot (e.g., ./uploads not public/).
 * - Log all attempts with minimal, non-sensitive metadata.
 */

import { randomUUID } from 'crypto';

// Allowed MIME types per policy (tight allow-list)
export const ALLOWED_UPLOAD_TYPES = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

// Max file size: 10MB
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Infer extension from MIME (for server-generated filenames)
export function extFromMime(mime: string): string | null {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return null;
  }
}

// Extract extension from a filename, if any (do NOT trust this for security)
export function extFromFilename(name: string): string | null {
  const idx = name.lastIndexOf('.');
  if (idx === -1) return null;
  const ext = name.slice(idx + 1).toLowerCase();
  return ext || null;
}

// Check declared MIME type against allow-list
export function checkMimeType(file: File, allowedTypes = ALLOWED_UPLOAD_TYPES): { ok: boolean; reason?: string } {
  const mime = (file.type || 'application/octet-stream').toLowerCase();
  if (!allowedTypes.has(mime)) {
    return { ok: false, reason: `Unsupported MIME type: ${mime}` };
  }
  return { ok: true };
}

// Check file size
export function checkFileSize(file: File, maxSize = MAX_UPLOAD_BYTES): { ok: boolean; reason?: string } {
  if (file.size > maxSize) {
    return { ok: false, reason: `File too large: ${(file.size / (1024 * 1024)).toFixed(2)} MB (max ${(maxSize / (1024 * 1024)).toFixed(0)} MB)` };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'Empty file not allowed' };
  }
  return { ok: true };
}

// Sniff magic bytes to detect real type
export function sniffMagicBytes(buffer: Buffer): { detected?: string } {
  if (buffer.length < 4) return {};

  // PDF: "%PDF"
  if (buffer.slice(0, 4).toString('ascii') === '%PDF') {
    return { detected: 'application/pdf' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length >= 8) {
    const sig = buffer.slice(0, 8);
    if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47 && sig[4] === 0x0D && sig[5] === 0x0A && sig[6] === 0x1A && sig[7] === 0x0A) {
      return { detected: 'image/png' };
    }
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { detected: 'image/jpeg' };
  }

  return {};
}

// Basic malicious content scan: look for suspicious patterns
// This is a heuristic; do not rely on this as the only defense.
export function scanForMalicious(buffer: Buffer): { ok: boolean; matches: string[] } {
  const matches: string[] = [];
  // Scan only the first ~256KB for performance (most payloads small)
  const window = buffer.slice(0, Math.min(buffer.length, 256 * 1024)).toString('utf8').toLowerCase();

  const patterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'php_tag', regex: /<\?php/ },
    { name: 'script_tag', regex: /<script\b/ },
    { name: 'event_handler_attr', regex: /\bon\w+\s*=/ }, // onerror=, onload= etc
    { name: 'javascript_url', regex: /javascript:/ },
    { name: 'eval_call', regex: /\beval\s*\(/ },
    { name: 'vbscript', regex: /vbscript:/ },
    { name: 'iframe_tag', regex: /<iframe\b/ },
    { name: 'object_tag', regex: /<object\b/ },
  ];

  for (const p of patterns) {
    if (p.regex.test(window)) matches.push(p.name);
  }

  return { ok: matches.length === 0, matches };
}

// Cross-check declared MIME vs detected signature
export function checkMagicBytes(buffer: Buffer, declaredMime: string): { ok: boolean; reason?: string; detected?: string } {
  const { detected } = sniffMagicBytes(buffer);
  if (!detected) {
    // If we cannot detect, be conservative but allow only if declared is allowed AND content scan passes.
    return { ok: false, reason: 'Unable to determine file type from signature' };
  }
  if (detected !== declaredMime) {
    return { ok: false, reason: `Mismatch between declared MIME (${declaredMime}) and detected type (${detected})`, detected };
  }
  return { ok: true, detected };
}

// Strong filename: server-side generated UUID with known extension
export function generateSafeFilename(ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${randomUUID()}.${safeExt}`;
}

// High-level validator to be used in route handlers
export async function validateFileUpload(
  file: File,
  options?: {
    allowedTypes?: Set<string>;
    maxBytes?: number;
    // When true, require magic bytes detection to succeed (recommended)
    requireMagicBytes?: boolean;
  }
): Promise<{
  safe: boolean;
  reason?: string;
  mimeType?: string;
  detectedMime?: string;
  size?: number;
  recommendedExt?: string | null;
}> {
  const allowed = options?.allowedTypes ?? ALLOWED_UPLOAD_TYPES;
  const maxBytes = options?.maxBytes ?? MAX_UPLOAD_BYTES;
  const requireMagic = options?.requireMagicBytes ?? true;

  const mime = (file.type || 'application/octet-stream').toLowerCase();
  const size = file.size;

  const sizeCheck = checkFileSize(file, maxBytes);
  if (!sizeCheck.ok) return { safe: false, reason: sizeCheck.reason, mimeType: mime, size };

  const mimeCheck = checkMimeType(file, allowed);
  if (!mimeCheck.ok) return { safe: false, reason: mimeCheck.reason, mimeType: mime, size };

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const malicious = scanForMalicious(buffer);
  if (!malicious.ok) {
    return { safe: false, reason: `Malicious patterns detected: ${malicious.matches.join(', ')}`, mimeType: mime, size };
  }

  const magic = checkMagicBytes(buffer, mime);
  if (requireMagic && !magic.ok) {
    return { safe: false, reason: magic.reason ?? 'Magic bytes check failed', mimeType: mime, detectedMime: magic.detected, size };
  }

  return {
    safe: true,
    mimeType: mime,
    detectedMime: magic.detected ?? undefined,
    size,
    recommendedExt: extFromMime(magic.detected ?? mime),
  };
}