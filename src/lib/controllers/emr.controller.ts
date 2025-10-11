import { EmrService, EmrSummary } from '@/lib/services/emr.service';
import { auditView, buildProvenanceMetadata } from '@/lib/audit/audit';
import type { NextRequest } from 'next/server';

/**
 * EMR Controller
 * Thin orchestration layer between routes and services for EMR summary and subresources.
 */
export class EmrController {
  /**
   * Get EMR summary for a provider-patient context and audit the view.
   */
  static async getSummary(
    request: NextRequest,
    session: any,
    providerId: string,
    patientId: string,
    includeCsv?: string
  ): Promise<EmrSummary> {
    const summary = await EmrService.getPatientSummary(providerId, patientId, includeCsv);

    // Audit with provenance metadata
    await auditView(
      request,
      session,
      'user',
      patientId,
      buildProvenanceMetadata(session, { patientId, providerId, include: includeCsv, entity: 'emr_summary' })
    );

    return summary;
  }
}