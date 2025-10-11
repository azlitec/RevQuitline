import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  auditView,
  auditCreate,
  auditUpdate,
  buildProvenanceMetadata,
} from '@/lib/audit/audit';
import { requirePermission, toProblemJson } from '@/lib/api/guard';

/**
 * Correspondence Templates API
 *
 * - GET /api/templates
 *   List templates (optionally filtered by category). Ensures seeding of default referral template.
 *
 * - POST /api/templates
 *   Create a new template.
 *
 * - PUT /api/templates
 *   Update an existing template.
 *
 * RBAC:
 * - GET requires 'correspondence.read'
 * - POST requires 'correspondence.update' (template management)
 * - PUT requires 'correspondence.update'
 *
 * Audit:
 * - Logs view/create/update with provenance metadata.
 */

// ===== Zod Schemas =====

const CorrespondenceCategoryEnum = z.enum(['referral', 'reply', 'discharge', 'memo']);

const TemplateCreateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().optional(),
  category: CorrespondenceCategoryEnum.optional(),
  htmlContent: z.string().min(1),
  fields: z.record(z.any()).optional(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const TemplateUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  subject: z.string().optional(),
  category: CorrespondenceCategoryEnum.optional(),
  htmlContent: z.string().optional(),
  fields: z.record(z.any()).optional(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const TemplateQuerySchema = z.object({
  page: z.coerce.number().int().nonnegative().default(0),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: CorrespondenceCategoryEnum.optional(),
  active: z.coerce.boolean().optional(),
  name: z.string().optional(),
});

// ===== Default Referral Template =====

const DEFAULT_REFERRAL_NAME = 'Referral Default';

const DEFAULT_REFERRAL_SUBJECT = 'Referral for {{patient.shortName}}';

const DEFAULT_REFERRAL_HTML = `
<div role="document" aria-label="Referral Letter">
  <section aria-label="Specialist details">
    <p><strong>Specialist:</strong> {{specialist.name}}</p>
    <p>{{specialist.address}}</p>
    <p>Contact: {{specialist.contact}}</p>
  </section>

  <section aria-label="Patient details">
    <p><strong>Patient:</strong> {{patient.name}}</p>
    <p>DOB: {{patient.dob}}</p>
    <p>Identifier: {{patient.identifier}}</p>
  </section>

  <section aria-label="Date">
    <p>Date: {{today}}</p>
  </section>

  <section aria-label="Greeting">
    <p>Dear {{specialist.salutation}},</p>
  </section>

  <section aria-label="Body intro">
    <p>
      Thank you for seeing {{patient.shortName}}, aged {{patient.age}} years, for an opinion and management.
    </p>
  </section>

  <section aria-label="Consultation Notes">
    <p>{{encounter.summary}}</p>
  </section>

  <section aria-label="Regular medications">
    <p><strong>Regular medications:</strong> {{medications.list | 'No regular medications.'}}</p>
  </section>

  <section aria-label="Allergies">
    <p><strong>Allergies:</strong> {{allergies.list | 'Not recorded.'}}</p>
  </section>

  <section aria-label="Past Medical History">
    <p><strong>Past Medical History:</strong> {{pmh.list | 'Not recorded.'}}</p>
  </section>

  <section aria-label="Closing">
    <p>
      Thank you for your opinion and management. If you need further details, please contact me at {{provider.email}}.
    </p>
  </section>

  <section aria-label="Sign-off">
    <p>Yours faithfully,</p>
    <p>{{provider.signatureImageHash}}</p>
    <p>{{provider.fullName}}</p>
    <p>MMC: {{provider.MMC}}</p>
  </section>

  <footer aria-label="MMC details">
    <p>{{mmc.details}}</p>
  </footer>
</div>
`.trim();

const DEFAULT_REFERRAL_FIELDS = {
  specialist: { name: '', address: '', contact: '', salutation: '' },
  patient: { name: '', shortName: '', dob: '', identifier: '', age: '' },
  today: '',
  encounter: { summary: '' },
  medications: { list: [] },
  allergies: { list: [] },
  pmh: { list: [] },
  provider: { email: '', fullName: '', MMC: '', signatureImageHash: '' },
  mmc: { details: '' },
};

// ===== Helpers =====

async function ensureDefaultReferralTemplate(session: any) {
  const existing = await prisma.template.findUnique({ where: { name: DEFAULT_REFERRAL_NAME } });
  if (existing) return existing;

  const created = await prisma.template.create({
    data: {
      name: DEFAULT_REFERRAL_NAME,
      subject: DEFAULT_REFERRAL_SUBJECT,
      category: 'referral' as any,
      htmlContent: DEFAULT_REFERRAL_HTML,
      fields: DEFAULT_REFERRAL_FIELDS as any,
      active: true,
      isDefault: true,
    },
    select: {
      id: true,
      name: true,
      subject: true,
      category: true,
      htmlContent: true,
      fields: true,
      active: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Audit create default seed
  // Use entityType 'template' and entityId created.id
  await auditCreate(
    // NextRequest is not available here; skip IP capture by passing a dummy Request derived from origin when GET handler calls this.
    // This function will be called within GET and POST handlers to ensure provenance is captured there.
    // We won't call audit here to avoid missing NextRequest; GET handler will log view with provenance.
    // Intentionally no audit here due to lack of Request context.
    // The handler will call auditView after seeding.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    {} as any,
    session,
    'template',
    created.id,
    buildProvenanceMetadata(session, { seeded: true, name: DEFAULT_REFERRAL_NAME })
  ).catch(() => {});

  return created;
}

function parseQuery(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const obj = {
    page: sp.get('page') ?? undefined,
    pageSize: sp.get('pageSize') ?? undefined,
    category: sp.get('category') ?? undefined,
    active: sp.get('active') ?? undefined,
    name: sp.get('name') ?? undefined,
  };
  const parsed = TemplateQuerySchema.safeParse(obj);
  if (!parsed.success) {
    throw Object.assign(new Error('Validation failed'), {
      status: 400,
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

// ===== GET (List + Seed Default Referral) =====

export async function GET(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: correspondence.read
    try {
      requirePermission(session, 'correspondence.read');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    // Seed default referral template if missing
    await ensureDefaultReferralTemplate(session);

    const { page, pageSize, category, active, name } = parseQuery(request);

    const where: any = {};
    if (category) where.category = category;
    if (typeof active === 'boolean') where.active = active;
    if (name) where.name = { contains: name, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          subject: true,
          category: true,
          htmlContent: true,
          fields: true,
          active: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.template.count({ where }),
    ]);

    await auditView(
      request,
      session,
      'template',
      'list',
      buildProvenanceMetadata(session, { page, pageSize, category, active, name })
    );

    const result = items.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject ?? null,
      category: t.category ?? null,
      htmlContent: t.htmlContent,
      fields: t.fields ?? null,
      active: t.active,
      isDefault: t.isDefault,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return NextResponse.json({ items: result, total, page, pageSize }, { status: 200 });
  } catch (err: any) {
    console.error('[Templates GET] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to list templates', status }), issues },
      { status }
    );
  }
}

// ===== POST (Create) =====

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: correspondence.update
    try {
      requirePermission(session, 'correspondence.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = TemplateCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const created = await prisma.template.create({
      data: {
        name: body.name,
        subject: body.subject ?? null,
        category: (body.category as any) ?? null,
        htmlContent: body.htmlContent,
        fields: body.fields ? (body.fields as any) : undefined,
        active: body.active ?? true,
        isDefault: body.isDefault ?? false,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        category: true,
        htmlContent: true,
        fields: true,
        active: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditCreate(
      request,
      session,
      'template',
      created.id,
      buildProvenanceMetadata(session, { name: created.name, category: created.category })
    );

    return NextResponse.json(
      {
        template: {
          ...created,
          subject: created.subject ?? null,
          category: created.category ?? null,
          fields: created.fields ?? null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Templates POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to create template', status }),
      { status }
    );
  }
}

// ===== PUT (Update) =====

export async function PUT(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: correspondence.update
    try {
      requirePermission(session, 'correspondence.update');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = TemplateUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const existing = await prisma.template.findUnique({
      where: { id: body.id },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const updated = await prisma.template.update({
      where: { id: body.id },
      data: {
        name: body.name ?? undefined,
        subject: body.subject ?? undefined,
        category: (body.category as any) ?? undefined,
        htmlContent: body.htmlContent ?? undefined,
        fields: body.fields ? (body.fields as any) : undefined,
        active: body.active ?? undefined,
        isDefault: body.isDefault ?? undefined,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        category: true,
        htmlContent: true,
        fields: true,
        active: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await auditUpdate(
      request,
      session,
      'template',
      updated.id,
      buildProvenanceMetadata(session, { name: updated.name, category: updated.category })
    );

    return NextResponse.json(
      {
        template: {
          ...updated,
          subject: updated.subject ?? null,
          category: updated.category ?? null,
          fields: updated.fields ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Templates PUT] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    return NextResponse.json(
      toProblemJson(err, { title: 'Failed to update template', status }),
      { status }
    );
  }
}