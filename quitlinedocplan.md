Quitline Dev Brief & Audit (Expanded)
Version: 2025-10-16

Summary
Next.js App Router app for smoking cessation with Patient, Provider, Admin portals. Core flows exist; fill gaps in prescriptions, push notifications, compliance, analytics polish, tests.

Architecture snapshot
- Framework: Next.js 14 (App Router), TypeScript, Tailwind, Prisma/PostgreSQL, NextAuth.
- Config: next and ts: [next.config.ts](next.config.ts), [tsconfig.json](tsconfig.json)
- Auth & middleware: [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts), [src/middleware.ts](src/middleware.ts)
- Database: Prisma schema & migrations: [prisma/schema.prisma](prisma/schema.prisma), [prisma/migrations/](prisma/migrations/20251010232304_add_integration_error_queue/migration.sql)
- Services layer: [src/lib/services/*.ts](src/lib/services/consultation.service.ts), [src/lib/controllers/*.ts](src/lib/controllers/emr.controller.ts)
- Integrations: Google OAuth/Calendar: [src/lib/google/calendar.ts](src/lib/google/calendar.ts), [src/app/api/provider/google/oauth/start/route.ts](src/app/api/provider/google/oauth/start/route.ts)
- Email: [src/lib/email/emailService.ts](src/lib/email/emailService.ts), [src/lib/email/sendReceipt.ts](src/lib/email/sendReceipt.ts)
- Audit/events: [src/lib/audit/audit.ts](src/lib/audit/audit.ts), [src/lib/events/bus.ts](src/lib/events/bus.ts)
- UI: Patient/Provider/Admin app pages under [src/app/*](src/app/patient/dashboard/page.tsx)

Environments
- Dev: local with docker-compose (DB) if used: [docker-compose.yml](docker-compose.yml)
- Staging: recommend Vercel + Neon/Postgres; add environment protections.
- Prod: same as staging with stricter secrets rotation and monitoring.

Runtime surfaces (high level)
- Patient APIs: doctors, messages, intake, appointments, dashboards, metrics.
- Provider APIs: patients EMR, notes, consultations, prescriptions, appointments.
- Admin APIs: users, approvals, payments, reports, analytics, exports.

Data model overview (prisma)
- Users, Roles, Providers, Patients; relationships for doctor-patient connections.
- Appointments, MedicalNotes, Consultations, Reports, ServiceTypes, Invoices.
- Messaging threads and messages; user online status; integration error queue.
- Prescriptions: partial; finalize model and relations: [prisma/schema.prisma](prisma/schema.prisma)

Key UX flows
- Patient: find doctor, connect, message, book appointment, fill intake, pay, manage doctors: [src/app/patient/*](src/app/patient/doctors/page.tsx)
- Provider: review inbox, patients, EMR, notes, prescriptions, investigations, meet: [src/app/provider/*](src/app/provider/dashboard/page.tsx)
- Admin: approvals, users, payments, reports/analytics: [src/app/admin/*](src/app/admin/dashboard/page.tsx)

Feature audit and score (0–10)
- Auth & RBAC — 8/10 — [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts), [src/app/api/auth/check-admin/route.ts](src/app/api/auth/check-admin/route.ts)
- Patient doctor discovery & profiles — 7/10 — [src/app/patient/doctors/page.tsx](src/app/patient/doctors/page.tsx), [src/app/patient/doctors/[id]/page.tsx](src/app/patient/doctors/[id]/page.tsx)
- Doctor connections — 6/10 — [src/app/api/patient/doctors/connect/route.ts](src/app/api/patient/doctors/connect/route.ts), [src/app/patient/my-doctors/page.tsx](src/app/patient/my-doctors/page.tsx)
- Messaging (P↔D) — 7/10 — [src/app/patient/messages/page.tsx](src/app/patient/messages/page.tsx), [src/app/api/patient/messages/send/route.ts](src/app/api/patient/messages/send/route.ts), [src/app/api/provider/messages/route.ts](src/app/api/provider/messages/route.ts)
- Appointments & Telehealth — 7/10 — [src/app/api/appointments/route.ts](src/app/api/appointments/route.ts), [src/app/api/appointments/[id]/meet/join/route.ts](src/app/api/appointments/[id]/meet/join/route.ts)
- Intake forms — 6/10 — [src/components/patient/IntakeForm.tsx](src/components/patient/IntakeForm.tsx), [src/app/api/patient/intake-form/route.ts](src/app/api/patient/intake-form/route.ts)
- EMR (notes, consultations) — 6/10 — [src/app/provider/patients/[id]/emr/page.tsx](src/app/provider/patients/[id]/emr/page.tsx), [src/app/api/provider/patients/[patientId]/emr/route.ts](src/app/api/provider/patients/[patientId]/emr/route.ts)
- Prescriptions — 4/10 — [src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts](src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts), [src/lib/services/prescription.service.ts](src/lib/services/prescription.service.ts)
- Investigations/Lab — 6/10 — [src/app/api/investigations/ingest/fhir/route.ts](src/app/api/investigations/ingest/fhir/route.ts), [src/app/api/investigations/orders/route.ts](src/app/api/investigations/orders/route.ts)
- Notifications — 5/10 — Email OK, Push TODO — [src/app/api/notifications/route.ts](src/app/api/notifications/route.ts), [src/lib/notifications/notificationService.ts](src/lib/notifications/notificationService.ts:61)
- Billing & payments — 6/10 — [src/app/admin/payments/page.tsx](src/app/admin/payments/page.tsx), [src/app/api/admin/payments/route.ts](src/app/api/admin/payments/route.ts)
- Reports & analytics — 6/10 — [src/app/api/admin/analytics/route.ts](src/app/api/admin/analytics/route.ts), [src/app/api/admin/reports/generate/route.ts](src/app/api/admin/reports/generate/route.ts)
- Correspondence & templates — 6/10 — [src/app/api/correspondence/route.ts](src/app/api/correspondence/route.ts), [src/app/api/templates/route.ts](src/app/api/templates/route.ts)
- Admin approvals & users — 7/10 — [src/app/admin/approvals/page.tsx](src/app/admin/approvals/page.tsx), [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts)
- Uploads/docs — 6/10 — [src/app/api/uploads/route.ts](src/app/api/uploads/route.ts), [uploads/](uploads/230cf6fa-d5c0-47ae-8a28-840a2866e081.pdf)
- Patient dashboards & metrics — 6/10 — [src/app/api/patient/dashboard/route.ts](src/app/api/patient/dashboard/route.ts), [src/app/api/patient/smoking-metrics/route.ts](src/app/api/patient/smoking-metrics/route.ts), [src/app/api/patient/vital-signs/route.ts](src/app/api/patient/vital-signs/route.ts)
- Progress notes finalize — 6/10 — [src/app/api/progress-notes/finalize/route.ts](src/app/api/progress-notes/finalize/route.ts)

Major gaps / TODOs (prioritized)
- Push notifications: implement FCM/OneSignal; user opt-in, tokens, topic routing — refs: [src/lib/notifications/notificationService.ts](src/lib/notifications/notificationService.ts:183)
- Prescription model: add Prisma model, services, UI; connect to EMR previews — refs: [src/lib/repositories/emr.repo.ts](src/lib/repositories/emr.repo.ts:142), [src/lib/services/emr.service.ts](src/lib/services/emr.service.ts:27)
- Input validation: zod/validators across all API routes; sanitize and enforce types — refs: [src/lib/validators/emr.ts](src/lib/validators/emr.ts)
- Rate limiting & anti-abuse on messaging/appointments; add per-user quotas.
- Error handling standardization; map to response helpers — refs: [src/lib/api/response.ts](src/lib/api/response.ts)
- Observability: structured logging, request IDs, metrics, tracing; error queue monitoring — refs: [src/lib/events/bus.ts](src/lib/events/bus.ts)
- Security review: secrets, session hardening, CSRF, authz checks in middleware.
- Tests/CI: unit, integration, e2e smoke; gate PRs; coverage targets.

Risks & compliance
- Handle PHI/PII: audit log completeness, least-privilege, encrypted in transit; check data retention policy.
- Review access control paths via middleware: [src/middleware.ts](src/middleware.ts)

KPIs (first release)
- Appointment booking time < 24h; message delivery latency < 2s; onboarding SLA < 48h; D7/D30 retention.

Execution plan (90 days)
- Weeks 1–2: Prescriptions (schema/migrations, services, UI, APIs); link to EMR.
- Weeks 3–4: Push notifications with opt-in; retries/backoff; alerting dashboards.
- Weeks 5–6: Telehealth polish (Meet links, calendar sync, reminders).
- Weeks 7–8: Admin analytics/export; cohort metrics; data pipeline.
- Weeks 9–12: Compliance hardening; load tests; failover; disaster recovery drills.

Testing strategy (KISS)
- Unit: services/utilities with mocks — focus: [src/lib/services/*](src/lib/services/notes.service.ts), [src/lib/utils.ts](src/lib/utils.ts)
- Integration: API routes with test DB — focus: [src/app/api/*](src/app/api/test/route.ts)
- E2E smoke: auth, doctor search, connect, message, appointment booking.
- CI: run on PR; report coverage; block below threshold.

Security checklist
- Auth: enforce session checks on server routes; scopes/roles verified.
- Input: validate/sanitize; escape/safe HTML; limit payload size.
- Transport: HTTPS only; HSTS; secure cookies.
- Data: least-privilege DB roles; backups; purge policies.
- Logging: no sensitive data in logs; structured logs with IDs.

Observability checklist
- Metrics: API latencies, error rates, message/appointment throughput.
- Tracing: wrap services/controllers; propagate request IDs.
- Alerts: error queue size, failed notifications, slow queries.

Deployment & ops
- Env vars: NEXTAUTH_SECRET, DB URL, email provider creds; verify in Vercel project.
- Migrations: run prisma migrate before deploy — [prisma/migrations](prisma/migrations/20251010232304_add_integration_error_queue/migration.sql)
- Rollback plan: keep previous migrations; use feature flags for risky changes.

Dev notes
- Keep endpoints idempotent; reuse validators and response helpers — [src/lib/api/response.ts](src/lib/api/response.ts)
- Single source of truth for business rules in services; avoid duplication.
- Prefer typed DTOs; avoid implicit any; maintain strict mode in tsconfig.

Backlog (quick list)
- Push notifications MVP
- Prescription end-to-end
- Rate limiting
- Analytics dashboards polish
- Compliance audit pass
- Test coverage ≥ 70%

Quickstart
- Install deps and run dev: npm i; npm run dev
- Configure env: NEXTAUTH providers, DB URL, mail creds; check [next.config.ts](next.config.ts)

End
Addendum: Extended details

Role-capability matrix (summary)
- Patient
  - Discover doctors: [src/app/patient/doctors/page.tsx](src/app/patient/doctors/page.tsx)
  - View doctor profile: [src/app/patient/doctors/[id]/page.tsx](src/app/patient/doctors/[id]/page.tsx)
  - Connect/disconnect: [src/app/api/patient/doctors/connect/route.ts](src/app/api/patient/doctors/connect/route.ts), [src/app/api/patient/my-doctors/disconnect/route.ts](src/app/api/patient/my-doctors/disconnect/route.ts)
  - Messaging: [src/app/patient/messages/page.tsx](src/app/patient/messages/page.tsx), [src/app/api/patient/messages/route.ts](src/app/api/patient/messages/route.ts), [src/app/api/patient/messages/send/route.ts](src/app/api/patient/messages/send/route.ts)
  - Appointments: [src/app/patient/appointments/page.tsx](src/app/patient/appointments/page.tsx), [src/app/api/appointments/route.ts](src/app/api/appointments/route.ts), [src/app/api/appointments/[id]/status/route.ts](src/app/api/appointments/[id]/status/route.ts), [src/app/api/appointments/[id]/meet/join/route.ts](src/app/api/appointments/[id]/meet/join/route.ts)
  - Intake form: [src/components/patient/IntakeForm.tsx](src/components/patient/IntakeForm.tsx), [src/app/api/patient/intake-form/route.ts](src/app/api/patient/intake-form/route.ts)
  - Billing: [src/app/patient/billing/page.tsx](src/app/patient/billing/page.tsx)
  - Dashboard &amp; metrics: [src/app/patient/dashboard/page.tsx](src/app/patient/dashboard/page.tsx), [src/app/api/patient/dashboard/route.ts](src/app/api/patient/dashboard/route.ts), [src/app/api/patient/smoking-metrics/route.ts](src/app/api/patient/smoking-metrics/route.ts)
- Provider
  - Inbox/messages: [src/app/provider/inbox/page.tsx](src/app/provider/inbox/page.tsx), [src/app/api/provider/messages/route.ts](src/app/api/provider/messages/route.ts), [src/app/api/provider/messages/send/route.ts](src/app/api/provider/messages/send/route.ts)
  - Patients &amp; EMR: [src/app/provider/patients/page.tsx](src/app/provider/patients/page.tsx), [src/app/provider/patients/[id]/emr/page.tsx](src/app/provider/patients/[id]/emr/page.tsx), [src/app/api/provider/patients/[patientId]/emr/route.ts](src/app/api/provider/patients/[patientId]/emr/route.ts)
  - Medical notes: [src/app/provider/medical-notes/[appointmentId]/page.tsx](src/app/provider/medical-notes/[appointmentId]/page.tsx), [src/app/api/provider/medical-notes/[appointmentId]/route.ts](src/app/api/provider/medical-notes/[appointmentId]/route.ts), [src/app/api/provider/patients/[patientId]/emr/notes/route.ts](src/app/api/provider/patients/[patientId]/emr/notes/route.ts), [src/app/api/provider/patients/[patientId]/emr/notes/finalize/route.ts](src/app/api/provider/patients/[patientId]/emr/notes/finalize/route.ts)
  - Prescriptions: [src/app/provider/prescriptions/page.tsx](src/app/provider/prescriptions/page.tsx), [src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts](src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts)
  - Investigations: [src/app/provider/investigations/page.tsx](src/app/provider/investigations/page.tsx), [src/app/api/investigations/orders/route.ts](src/app/api/investigations/orders/route.ts), [src/app/api/investigations/results/route.ts](src/app/api/investigations/results/route.ts)
  - Appointments &amp; Meet: [src/app/provider/appointments/page.tsx](src/app/provider/appointments/page.tsx), [src/app/api/provider/appointments/route.ts](src/app/api/provider/appointments/route.ts), [src/app/api/provider/appointments/[appointmentId]/meet/route.ts](src/app/api/provider/appointments/[appointmentId]/meet/route.ts), [src/app/api/provider/appointments/[appointmentId]/meet/end/route.ts](src/app/api/provider/appointments/[appointmentId]/meet/end/route.ts)
  - Reports: [src/app/provider/reports/page.tsx](src/app/provider/reports/page.tsx)
  - Profile: [src/app/provider/profile/page.tsx](src/app/provider/profile/page.tsx), [src/app/api/provider/profile/route.ts](src/app/api/provider/profile/route.ts)
- Admin
  - Users &amp; approvals: [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx), [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts), [src/app/api/admin/users/[id]/provider-approval/route.ts](src/app/api/admin/users/[id]/provider-approval/route.ts)
  - Payments: [src/app/admin/payments/page.tsx](src/app/admin/payments/page.tsx), [src/app/api/admin/payments/route.ts](src/app/api/admin/payments/route.ts)
  - Reports &amp; analytics &amp; export: [src/app/admin/reports/page.tsx](src/app/admin/reports/page.tsx), [src/app/api/admin/analytics/route.ts](src/app/api/admin/analytics/route.ts), [src/app/api/admin/analytics/export/route.ts](src/app/api/admin/analytics/export/route.ts), [src/app/api/admin/reports/generate/route.ts](src/app/api/admin/reports/generate/route.ts)
  - Dashboard: [src/app/admin/dashboard/page.tsx](src/app/admin/dashboard/page.tsx), [src/app/api/admin/dashboard/route.ts](src/app/api/admin/dashboard/route.ts)

API surface summary (by group)
- Patient endpoints: [src/app/api/patient/dashboard/route.ts](src/app/api/patient/dashboard/route.ts), [src/app/api/patient/doctors/route.ts](src/app/api/patient/doctors/route.ts), [src/app/api/patient/doctors/[id]/route.ts](src/app/api/patient/doctors/[id]/route.ts), [src/app/api/patient/doctors/connect/route.ts](src/app/api/patient/doctors/connect/route.ts), [src/app/api/patient/messages/route.ts](src/app/api/patient/messages/route.ts), [src/app/api/patient/messages/send/route.ts](src/app/api/patient/messages/send/route.ts), [src/app/api/patient/messages/start/route.ts](src/app/api/patient/messages/start/route.ts), [src/app/api/patient/my-doctors/route.ts](src/app/api/patient/my-doctors/route.ts), [src/app/api/patient/my-doctors/disconnect/route.ts](src/app/api/patient/my-doctors/disconnect/route.ts), [src/app/api/patient/intake-form/route.ts](src/app/api/patient/intake-form/route.ts), [src/app/api/patient/smoking-metrics/route.ts](src/app/api/patient/smoking-metrics/route.ts), [src/app/api/patient/vital-signs/route.ts](src/app/api/patient/vital-signs/route.ts)
- Provider endpoints: [src/app/api/provider/patients/route.ts](src/app/api/provider/patients/route.ts), [src/app/api/provider/patients/[patientId]/emr/route.ts](src/app/api/provider/patients/[patientId]/emr/route.ts), [src/app/api/provider/patients/[patientId]/emr/consultations/route.ts](src/app/api/provider/patients/[patientId]/emr/consultations/route.ts), [src/app/api/provider/patients/[patientId]/emr/notes/route.ts](src/app/api/provider/patients/[patientId]/emr/notes/route.ts), [src/app/api/provider/patients/[patientId]/emr/notes/finalize/route.ts](src/app/api/provider/patients/[patientId]/emr/notes/finalize/route.ts), [src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts](src/app/api/provider/patients/[patientId]/emr/prescriptions/route.ts), [src/app/api/provider/messages/route.ts](src/app/api/provider/messages/route.ts), [src/app/api/provider/messages/send/route.ts](src/app/api/provider/messages/send/route.ts), [src/app/api/provider/appointments/route.ts](src/app/api/provider/appointments/route.ts), [src/app/api/provider/appointments/[appointmentId]/route.ts](src/app/api/provider/appointments/[appointmentId]/route.ts), [src/app/api/provider/appointments/[appointmentId]/meet/route.ts](src/app/api/provider/appointments/[appointmentId]/meet/route.ts), [src/app/api/provider/appointments/[appointmentId]/meet/end/route.ts](src/app/api/provider/appointments/[appointmentId]/meet/end/route.ts), [src/app/api/provider/profile/route.ts](src/app/api/provider/profile/route.ts), [src/app/api/provider/google/oauth/start/route.ts](src/app/api/provider/google/oauth/start/route.ts), [src/app/api/provider/google/oauth/callback/route.ts](src/app/api/provider/google/oauth/callback/route.ts), [src/app/api/provider/patients/audit/route.ts](src/app/api/provider/patients/audit/route.ts)
- Admin endpoints: [src/app/api/admin/users/route.ts](src/app/api/admin/users/route.ts), [src/app/api/admin/users/[id]/route.ts](src/app/api/admin/users/[id]/route.ts), [src/app/api/admin/users/[id]/role/route.ts](src/app/api/admin/users/[id]/role/route.ts), [src/app/api/admin/users/[id]/provider-approval/route.ts](src/app/api/admin/users/[id]/provider-approval/route.ts), [src/app/api/admin/approvals/route.ts](src/app/api/admin/approvals/route.ts), [src/app/api/admin/payments/route.ts](src/app/api/admin/payments/route.ts), [src/app/api/admin/reports/route.ts](src/app/api/admin/reports/route.ts), [src/app/api/admin/reports/generate/route.ts](src/app/api/admin/reports/generate/route.ts), [src/app/api/admin/analytics/route.ts](src/app/api/admin/analytics/route.ts), [src/app/api/admin/analytics/export/route.ts](src/app/api/admin/analytics/export/route.ts), [src/app/api/admin/dashboard/route.ts](src/app/api/admin/dashboard/route.ts)

Standard response &amp; validation
- Response helpers: [src/lib/api/response.ts](src/lib/api/response.ts)
- Access guard: [src/lib/api/guard.ts](src/lib/api/guard.ts)
- Validators: [src/lib/validators/emr.ts](src/lib/validators/emr.ts)
- Convention: Always return typed payloads with explicit status codes; avoid leaking internal errors.

Events &amp; background processing
- Event bus: [src/lib/events/bus.ts](src/lib/events/bus.ts)
- Integration error queue (migrations): [prisma/migrations/20251010232304_add_integration_error_queue/migration.sql](prisma/migrations/20251010232304_add_integration_error_queue/migration.sql)
- Retry ingestion: [src/app/api/investigations/ingest/retry/route.ts](src/app/api/investigations/ingest/retry/route.ts)

Notifications (triggers)
- Email: [src/lib/email/emailService.ts](src/lib/email/emailService.ts), receipts: [src/lib/email/sendReceipt.ts](src/lib/email/sendReceipt.ts)
- Push (TODO): [src/lib/notifications/notificationService.ts](src/lib/notifications/notificationService.ts:61) and (src/lib/notifications/notificationService.ts:183)
- Trigger points: appointment status changes, message received, report availability, invoice paid.

Configuration &amp; env
- Next config: [next.config.ts](next.config.ts)
- Tailwind: [tailwind.config.js](tailwind.config.js)
- TypeScript: [tsconfig.json](tsconfig.json)
- ESLint: [eslint.config.mjs](eslint.config.mjs)
- Docker compose (DB): [docker-compose.yml](docker-compose.yml)
- Required envs: NEXTAUTH_SECRET, DATABASE_URL, EMAIL_*, GOOGLE_CLIENT_ID/SECRET, BASE_URL.

Security &amp; compliance specifics
- Middleware enforcement: [src/middleware.ts](src/middleware.ts)
- Audit API: [src/app/api/provider/patients/audit/route.ts](src/app/api/provider/patients/audit/route.ts)
- Data handling: ensure PHI is restricted to provider/patient contexts; no PHI in client logs; redact in server logs.

Performance &amp; SLO targets
- P95 API latency &lt; 300ms for internal APIs; &lt; 800ms for heavy queries.
- P95 page TTFB &lt; 500ms (SSR), hydration warnings minimized.
- Message delivery (email) &lt; 2s; push &lt; 1s when implemented.
- DB query budget: avoid N+1; use indexed queries; add pagination consistently.

Feature flags &amp; release management
- Gate new modules via env-based flags in config: [next.config.ts](next.config.ts)
- Dark launches for push notifications and prescriptions; gradual rollout.

Directory conventions (quick)
- App router pages: [src/app](src/app/layout.tsx)
- APIs: [src/app/api](src/app/api/test/route.ts)
- Lib/services/controllers: [src/lib/services](src/lib/services/notes.service.ts), [src/lib/controllers](src/lib/controllers/emr.controller.ts)
- Data access: [src/lib/db/index.ts](src/lib/db/index.ts)
- Types: [src/app/types/index.ts](src/app/types/index.ts), [src/types](src/types/nodemailer.d.ts)

Open questions (resolve before prod)
- Finalize Prescription schema fields and e-prescribing workflow.
- Decide on push provider (FCM vs OneSignal) and consent UX.
- Define retention policy for messages, notes, and uploads.
- Clarify appointment cancellation rules and fees.
- Confirm reporting metrics definitions and privacy constraints.

This addendum complements the main brief and keeps the KISS/DRY style while adding operational clarity and concrete file references.