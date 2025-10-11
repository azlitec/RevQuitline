import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { auditView, buildProvenanceMetadata } from '@/lib/audit/audit';
import { requirePermission, toProblemJson } from '@/lib/api/guard';
import { resolveMergeFields } from '@/lib/correspondence/merge';

/**
 * Render Correspondence Template with Merge Fields (+ optional PDF export)
 * POST /api/correspondence/render
 *
 * Body:
 * - templateId?: string  OR  htmlContent?: string (one of these is required)
 * - mergeFields: Record<string, any>
 * - format?: 'html' | 'pdf' (default 'html')
 *
 * Behavior:
 * - If templateId provided, loads template htmlContent from DB; otherwise uses provided htmlContent.
 * - Resolves {{...}} tokens using mergeFields (supports nested paths and fallback via pipe syntax).
 * - Returns resolved HTML. If format='pdf', attempts to generate PDF and returns base64.
 *   If PDF dependencies are unavailable, returns 501 with guidance.
 *
 * RBAC:
 * - Requires 'correspondence.create' (authoring correspondence)
 *
 * Audit:
 * - Logs a 'view' event against entityType 'template' with id 'render' to record usage/provenance.
 */

// ===== Zod Schema =====

const RenderSchema = z
  .object({
    templateId: z.string().optional(),
    htmlContent: z.string().optional(),
    mergeFields: z.record(z.any()).default({}),
    format: z.enum(['html', 'pdf']).default('html'),
  })
  .refine((data) => !!data.templateId || !!data.htmlContent, {
    message: 'Either templateId or htmlContent must be provided',
    path: ['htmlContent'],
  });

// ===== Handler =====

export async function POST(request: NextRequest) {
  let session: any | null = null;
  try {
    session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC
    try {
      requirePermission(session, 'correspondence.create');
    } catch (err: any) {
      return NextResponse.json(
        toProblemJson(err, { title: 'Permission error', status: err?.status ?? 403 }),
        { status: err?.status ?? 403 }
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = RenderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    let htmlTemplate = body.htmlContent ?? '';
    if (body.templateId) {
      const tpl = await prisma.template.findUnique({
        where: { id: body.templateId },
        select: { id: true, name: true, htmlContent: true, fields: true, category: true },
      });
      if (!tpl) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      htmlTemplate = tpl.htmlContent;
    }

    const resolvedHtml = resolveMergeFields(htmlTemplate, body.mergeFields ?? {});

    // Audit rendering usage (not per-template id to reduce noise)
    await auditView(
      request,
      session,
      'template',
      'render',
      buildProvenanceMetadata(session, {
        templateId: body.templateId ?? null,
        format: body.format,
      })
    );

    if (body.format === 'html') {
      return NextResponse.json({ resolvedHtml }, { status: 200 });
    }

    // Attempt PDF generation via puppeteer if available
    try {
      // Dynamic import to avoid hard dependency
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const puppeteer = await import('puppeteer').catch(() => null);
      if (!puppeteer) {
        return NextResponse.json(
          {
            error: 'PDF generation dependency not available',
            detail:
              "Install 'puppeteer' and ensure server runtime allows headless Chromium to generate PDFs, or use client-side print-to-PDF.",
          },
          { status: 501 }
        );
      }

      const browser = await (puppeteer as any).launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(resolvedHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer: Buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      });
      await browser.close();

      const base64Pdf = pdfBuffer.toString('base64');
      return NextResponse.json(
        { resolvedHtml, pdfBase64: base64Pdf },
        { status: 200 }
      );
    } catch (err: any) {
      console.error('[Correspondence Render PDF] Error', err);
      return NextResponse.json(
        { error: 'Failed to generate PDF', detail: err?.message ?? 'Unknown error', resolvedHtml },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('[Correspondence Render POST] Error', err);
    const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
    const issues = err?.issues;
    return NextResponse.json(
      { ...toProblemJson(err, { title: 'Failed to render correspondence', status }), issues },
      { status }
    );
  }
}