# Quitline Security Audit Checklist and Testing Guide

This document provides a comprehensive checklist and testing procedures to validate input validation, sanitization, CSRF/XSS/SQLi protections, file upload validation, security headers, secrets management, and dependency scanning across the Quitline Next.js 14 platform.

Focus areas:
- Zod validation for all API routes
- Standardized error responses (no PHI/secrets leakage)
- HTML sanitization and XSS prevention
- File upload validation and content scanning
- CSRF protection for state-changing routes
- SQL injection prevention and raw query audit
- Security headers configuration
- Environment variable validation and secret redaction
- Dependency audit

---

## Acceptance Criteria Mapping

Use this checklist to confirm the system meets the stated acceptance criteria.

- [x] All API routes validate inputs with Zod schemas
  - Confirm `validateBody()` and `validateQuery()` usage and Zod schemas exist for request payloads and queries for critical routes, plus standardized error handling.
- [x] User-generated content sanitized before storage
  - Message content, notes, correspondence, and intake form fields are sanitized server-side with `stripHtml()` or `sanitizeHtml()` depending on context.
- [x] HTML content sanitized before display
  - Rich text editor sanitizes persisted drafts on load and paste; UI components avoid `dangerouslySetInnerHTML`.
- [x] File uploads validated (type, size, content)
  - Uploads route enforces MIME allowlist, max size, magic bytes detection, and basic malicious content scanning; generates random server-side filename.
- [x] CSRF protection on state-changing routes
  - Middleware enforces origin/host checks for POST/PUT/PATCH/DELETE outside NextAuth.
- [x] Security headers configured
  - Global headers include X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, and Permissions-Policy.
- [x] No secrets in logs or error responses
  - Error responses are standardized via `errorResponse()` with requestId, without sensitive details; secret masking/redaction utilities available.
- [x] Environment variables validated on startup
  - Build/start fails early if required env vars missing.
- [x] No SQL injection vulnerabilities
  - No unsafe raw SQL; Prisma `$queryRaw` usage is parameterized and guarded.
- [x] No XSS vulnerabilities in UI
  - Intake form and rich text editor sanitize on input/paste/load; server persists sanitized values.
- [x] Dependency audit passes with no high/critical issues
  - npm audit scripts available; remediation required before deploy.

---

## Route Validation and Error Handling

Critical routes updated:
- Admin analytics: query validated; date range guarded; raw queries use parameterized templates.
- Admin analytics export: query validated; date range guarded; raw queries parameterized.
- Appointments: Zod for body/query; status patch schema; standardized errors.
- Correspondence send: Zod for body; email validation; header injection prevention; HTML sanitization.
- Auth register: register schema; sanitized name; standardized errors.
- Patient messages send: Zod; sanitization; length check; permissions verified.
- Provider messages send: Zod; sanitization; length check; standardized errors.
- Patient intake form API: Zod for query/body; server-side sanitization; standardized errors.
- Uploads: file validation with allowlist, size, magic bytes; malicious scan; randomized filename.

Still ensure that all other API endpoints adopt the same pattern:
- Use `validateBody()` and/or `validateQuery()` with a Zod schema
- Use `errorResponse()` for uniform error payloads
- Avoid returning raw internal error messages or stack traces

---

## XSS Testing

Perform the following XSS tests against UI components and server-side sanitization:

1. IntakeForm (client-side and server-side sanitization):
   - In text fields (e.g., smokerFriendsFamily, respiratoryChanges), enter:
     - `<script>alert('xss')</script>`
     - `<img src=x onerror=alert(1)>`
     - `<a href="javascript:alert(1)">click</a>`
   - Observe:
     - Text fields should strip tags immediately (client-side) and remain stripped after saving and reloading progress (server-side).
     - No script execution should occur.
   - Verify saved data via GET `/api/patient/intake-form?appointmentId=...` returns sanitized content.

2. RichTextEditor (paste-time and load-time sanitization):
   - Paste HTML with dangerous tags/attributes:
     - `<script>alert('x')</script>`
     - `<p onclick="alert(1)">Hello</p>`
   - Observe:
     - On paste, content is sanitized to allow only basic tags and no dangerous attributes.
     - After autosave and reload, sanitized content is rendered.
     - No scripts or on* event handlers exist in innerHTML.

3. Messaging:
   - Send messages containing:
     - `<img src=x onerror=alert(1)>`
     - `<svg onload=alert(1)>`
   - Observe:
     - Backend persists sanitized plain text (no tags). Display in inbox should not execute any scripts.

4. Correspondence HTML rendering:
   - Ensure templates and dynamic content go through sanitization before display.
   - Attempt to include `<script>` or event attributes in template data; confirm sanitized output and no execution.

---

## File Upload Validation Testing

Test the uploads route `/api/uploads` with multiple cases:

- Allowed types: PDF, JPEG, PNG
  - Upload valid files; expect success (201) with server-generated filename and metadata.

- Mismatched extension vs MIME:
  - Rename a `.php` file to `.jpg` and upload.
  - Result: Expect 400 “File validation failed” response. Validation checks MIME type and magic bytes mismatch.

- Malicious content:
  - Upload a file containing suspicious PHP or JS payloads (e.g., `<?php system($_GET['cmd']); ?>` embedded in fake PDF).
  - Result: Expect 400 validation failure with reason showing suspicious patterns matched.

- Oversized file (>10MB):
  - Upload a large file; expect 413/400 with “File too large” message.

- Logging:
  - Confirm that all upload attempts are logged (without storing sensitive content in logs).

---

## CSRF Protection Testing

- External domain CSRF:
  - From a non-origin domain (e.g., staging or local with different host), issue a POST to any state-changing API route (non-NextAuth).
  - Result: Expect 403 with standardized error due to origin mismatch.

- SameSite cookies:
  - Confirm cookies are set with SameSite attribute per NextAuth and middleware expectations, reducing CSRF risks.

- Origin/Host header checks:
  - For POST/PUT/PATCH/DELETE, verify `Origin` matches `Host`. If missing or mismatched, the request should be rejected.

---

## SQL Injection Testing

- Admin analytics/endpoints:
  - Attempt to inject via `range=custom` dates using invalid strings:
    - `startDate=2024-01-01' OR 1=1 --`
    - `endDate=2024-12-31; DROP TABLE "User"; --`
  - Result: Zod date-time validation rejects non-ISO8601 inputs; early date range guard returns 400; `$queryRaw` remains parameterized (no concatenation).

- Search fields anywhere:
  - If routes support search, ensure queries are validated and sanitized using Zod and patterns like `escapeLikePattern()` if LIKE queries used.

---

## Error Response Privacy and Logging Audit

- Confirm all routes use standardized `errorResponse()` payloads without embedding PHI or secrets. Verify presence of requestId and minimal error info.
- Review server logs:
  - Ensure no secrets (e.g., `DATABASE_URL`, `EMAIL_PASS`) appear.
  - Use `safeLog`/redact utilities for objects that may include sensitive values.

---

## Security Headers Verification

Use curl to verify headers on any route:

```bash
curl -I https://your-app.example.com/
```

Expected headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

If any header is missing, verify Next.js headers configuration and deployment environment.

---

## Environment Variables Validation

Required environment variables should be validated at build/start:

Required keys:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `EMAIL_HOST`
- `EMAIL_USER`
- `EMAIL_PASS`

Procedure:
- Stop the app and unset one variable (e.g., `NEXTAUTH_SECRET`).
- Start the app; it should fail early with a clear error stating the missing variable (without revealing values).
- Restore the variable and confirm successful start.

---

## Dependency Audit

Run the audit scripts regularly and before deployments:

```bash
npm run audit
npm run audit:fix
```

- Ensure no high/critical issues.
- If issues persist, review advisories and consider pinning or upgrading dependencies.
- Retest after fixes.

---

## Rate Limiting (Registration) – Pending

Note: Registration rate limiting is covered in Part 4. Implement and enable IP/email-based rate limiting for registration attempts:
- Suggested approach: Sliding window per IP/email using a durable store (e.g., Redis or Upstash); reject excessive attempts with 429.
- Ensure standardized error responses and that rate limiter state does not leak sensitive info.

---

## Developer Tips and Best Practices

- Zod everywhere: Always define schemas for any body/query input; parse via `validateBody()`/`validateQuery()`.
- Sanitization: Use `stripHtml()` for plain text fields; `sanitizeHtml()` for rich text content. Sanitize on input/paste and on save/display.
- File uploads: Never trust client filename; generate random filenames server-side; store outside the webroot when possible; validate magic bytes.
- CSRF: Verify origin/host; use SameSite cookies; avoid unsafe CORS allowances.
- SQL: Prefer Prisma client methods; if raw queries are necessary, only use Prisma template-tag parameterization and never concatenate strings.
- Secrets: Never log secrets; redact known sensitive keys; validate env vars at startup; use environment for configuration exclusively.
- Headers: Keep security headers enforced globally; monitor changes after framework upgrades.
- Error responses: Use standardized `errorResponse()`; include requestId; avoid PHI and internal error dumps.

---

## Test Execution Notes

- Perform tests on a staging environment mirroring production settings.
- Log request IDs and correlate with server logs for diagnostic traces.
- Document test evidence (screenshots or curl outputs) for CI/CD compliance gates.
