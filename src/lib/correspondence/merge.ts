/**
 * Merge-field engine for correspondence templates.
 * Resolves tokens like:
 * - {{specialist.name}}
 * - {{patient.name}}
 * - {{today}}
 * - Supports nested fields and default fallback via pipe syntax:
 *   {{medications.list | 'No regular medications.'}}
 * - Arrays are joined with ', ' by default
 * - Non-string values are coerced to string safely
 *
 * Safety:
 * - This is a server-side HTML templating pass; HTML content in values will be injected as-is.
 *   Ensure values provided are sanitized appropriately for your use case.
 */

type MergeFields = Record<string, unknown>;

/**
 * Safely get a nested value by dot path (e.g., 'patient.name')
 */
function getByPath(obj: any, path: string): unknown {
  if (!obj || !path) return undefined;
  const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
  let current = obj;
  for (const p of parts) {
    if (current == null) return undefined;
    current = current[p];
  }
  return current;
}

/**
 * Coerce a value into a display string:
 * - Arrays -> joined by ', '
 * - Date -> ISO string
 * - Objects -> JSON string
 * - null/undefined -> ''
 */
function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((v) => toDisplayString(v)).filter((s) => s.length > 0).join(', ');
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Parse a token with optional default fallback using pipe syntax:
 * Example: "medications.list | 'No regular medications.'"
 * Returns { path: 'medications.list', fallback: 'No regular medications.' }
 */
function parseToken(tokenInner: string): { path: string; fallback?: string } {
  const parts = tokenInner.split('|');
  const path = parts[0].trim();
  let fallback: string | undefined;

  if (parts.length > 1) {
    // Join the remaining parts back, and then extract a quoted string if present
    const right = parts.slice(1).join('|').trim();
    // Allow either single or double quotes
    const m = right.match(/^(['"])(.*?)\1$/);
    if (m) {
      fallback = m[2];
    } else if (right.length > 0) {
      // If not quoted, use raw text trimmed
      fallback = right;
    }
  }

  return { path, fallback };
}

/**
 * Provide built-in defaults (e.g., today) and ensure known sections exist to avoid undefined access.
 */
function withDefaults(fields: MergeFields): MergeFields {
  const enriched: MergeFields = {
    today: new Date().toISOString(),
    ...fields,
  };

  // Ensure common top-level objects exist
  const defaults = ['specialist', 'patient', 'encounter', 'medications', 'allergies', 'pmh', 'provider', 'mmc'];
  for (const key of defaults) {
    if (!(key in enriched) || enriched[key] == null) {
      enriched[key] = {};
    }
  }

  // Ensure list arrays for medications/allergies/pmh
  if (!Array.isArray((enriched.medications as any)?.list)) {
    (enriched.medications as any).list = (enriched.medications as any).list ?? [];
  }
  if (!Array.isArray((enriched.allergies as any)?.list)) {
    (enriched.allergies as any).list = (enriched.allergies as any).list ?? [];
  }
  if (!Array.isArray((enriched.pmh as any)?.list)) {
    (enriched.pmh as any).list = (enriched.pmh as any).list ?? [];
  }

  return enriched;
}

/**
 * Resolve all {{...}} tokens within the provided HTML template using given fields.
 * - Supports nested paths and default fallback via pipe syntax.
 */
export function resolveMergeFields(htmlTemplate: string, fields: MergeFields): string {
  const context = withDefaults(fields);
  const tokenRegex = /\{\{\s*([^}]+?)\s*\}\}/g;

  return htmlTemplate.replace(tokenRegex, (_match, inner: string) => {
    const { path, fallback } = parseToken(inner);
    const value = getByPath(context, path);
    const display = toDisplayString(value);

    if (display && display.trim().length > 0) {
      return display;
    }
    if (fallback != null) {
      return fallback;
    }
    return '';
  });
}

/**
 * Simple helper to render a template with fields and return both original and resolved HTML.
 */
export function renderTemplate(htmlTemplate: string, fields: MergeFields): { resolvedHtml: string } {
  const resolvedHtml = resolveMergeFields(htmlTemplate, fields);
  return { resolvedHtml };
}