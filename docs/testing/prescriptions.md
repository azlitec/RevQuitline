# Prescription Management Manual Testing Guide

Context: Next.js 14 app, Prisma + PostgreSQL, NextAuth RBAC. Test in dev environment.

## Prerequisites
- Seed two users: provider and patient linked via approved doctorPatientConnection.
- Logged-in sessions for provider and patient in separate browsers.
- Ensure Prisma schema has Prescription model and client generated.

## Verify Prisma Migration
- Run: `npx prisma migrate dev && npx prisma generate`
- Confirm no errors; check table "Prescription" exists in DB.

## Provider EMR: Create Prescription
- Navigate to Provider portal > Patient EMR.
- Open Prescriptions tab, click New Prescription.
- Fill fields; observe auto-save badge transitions "Saving…", "Saved".
- Click Submit & Activate.
- Expected:
  - API returns 201; status ACTIVE; patient notification created.
  - EMR Active Medications chips show medication.
  - Audit entry recorded for create.

## Provider Prescriptions List and Filters
- Navigate to Provider > Prescriptions.
- Use status filter = ACTIVE; date range; patient search.
- Click Apply Filters; verify table results match filters.
- Clear filters; verify all recent prescriptions display.

## Edit DRAFT Prescription
- Filter status = DRAFT; select Edit on a row.
- Modal opens pre-filled; modify fields; observe auto-save badge.
- Click Submit & Activate to transition to ACTIVE.
- Expected:
  - PATCH /api/prescriptions/[id] returns 200.
  - Row status updates; audit entry recorded for update.

## Cancel ACTIVE Prescription
- From Provider page or EMR, click Cancel; provide reason.
- Expected:
  - DELETE /api/prescriptions/[id] returns 200.
  - Status becomes CANCELLED; endDate stamped; reason appended in notes.
  - Patient notification “Prescription Cancelled” created.
  - Audit entry recorded for cancellation.

## Patient Prescriptions Page
- Login as patient; visit /patient/prescriptions.
- Verify Active Prescriptions cards; expand View Details.
- Verify dosage, frequency, duration, instructions, pharmacy, refills, prescriber.
- Click Print Prescription; printable page opens in new tab.
- Toggle Past Prescriptions; verify CANCELLED/COMPLETED/EXPIRED items.

## Print/Export
- From Provider list, click print icon on a prescription row.
- Expected: /api/prescriptions/[id]/print returns HTML; browser print dialog works.

## Validation Errors (Zod)
- Try invalid inputs:
  - Quantity <= 0
  - Refills > 5
  - Duration malformed (e.g., “abc”)
  - Pharmacy phone invalid format
- Expected: 400 responses with structured error messages from validation.

## RBAC and Auth Guards
- Unauthenticated: any route returns 401.
- Patient attempting PATCH/DELETE: 403.
- Provider accessing another provider’s prescription: 403.
- Admin/Clerk can GET/PATCH/DELETE; ensure permissions include medication.update.

## Audit Logging
- After create/update/cancel/view, fetch audit trail via provider audit route.
- Verify entries include entity: “prescription”, providerId, patientId, action, and request metadata.

## Notifications
- After creation (ACTIVE), cancellation, expiration/completion, check NotificationService inbox.
- Verify patient receives alert/info with appropriate title and link to /patient/prescriptions.

## No N+1 Queries
- Inspect API JSON response envelopes for includes:
  - patient: { id, firstName, lastName }
  - provider: { id, firstName, lastName }
  - appointment: minimal fields
- Ensure UI does not trigger extra fetches per row.

## Expiration Batch Job
- Create prescription with endDate in the past and status ACTIVE.
- POST /api/jobs/prescriptions/expire.
- Expected:
  - Response includes updatedCount >= 1.
  - Target prescription status becomes EXPIRED.
  - Audit entry “JOB_EXPIRE” recorded.

## Responsive UI
- Simulate mobile viewport ≤ 375px width.
- Verify cards and tables stack properly; touch targets are usable.

## Troubleshooting
- If auto-save fails in modal:
  - Check network panel for POST/PUT errors.
  - Validate patient link approval exists.
- If print page 404:
  - Confirm ownership (patient/provider; admin/clerk allowed).
  - Verify prescription id and session.
- If validation rejects, inspect error detail in response envelope.

## Useful Endpoints
- Provider list: GET /api/provider/prescriptions?status=ACTIVE&dateFrom=YYYY-MM-DD
- Provider create: POST /api/provider/prescriptions
- Patient list: GET /api/patient/prescriptions?status=ACTIVE
- Single prescription: GET /api/prescriptions/[id]
- Update (provider/admin): PATCH /api/prescriptions/[id]
- Cancel (provider/admin): DELETE /api/prescriptions/[id] { reason }
- Print: GET /api/prescriptions/[id]/print
- Expire job: POST /api/jobs/prescriptions/expire

## Acceptance Criteria Checklist
- Prisma migration runs successfully
- Provider can create prescription from patient EMR page
- Provider can view all prescriptions with filters
- Provider can update DRAFT prescriptions
- Provider can cancel prescriptions with reason
- Patient can view active prescriptions
- Patient receives notification on new prescription
- All API routes enforce auth/role guards
- Audit logs created for all actions
- Input validation catches invalid data
- No N+1 queries (includes used)
- Responsive on mobile devices

## Notes
- The expiration scheduler is exposed as an API job; wire an external cron (e.g., Vercel Cron or GitHub Actions) to POST this endpoint nightly.
- For real PDFs, replace generatePrescriptionPDF HTML with a dedicated PDF generator.