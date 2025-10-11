import { EmrRepository } from '@/lib/repositories/emr.repo';
import { parseEmrIncludes } from '@/lib/validators/emr';

export type EmrSummaryExpansion = {
  consultations?: Array<{
    id: string;
    type: string;
    mode: string;
    startTime: string;
    endTime: string | null;
    status: string;
    latestNote: {
      id: string;
      status: string;
      summary: string | null;
      updatedAt: string;
    } | null;
  }>;
  notes?: Array<{
    id: string;
    encounterId: string | null;
    status: string;
    summary: string | null;
    updatedAt: string;
    finalizedAt: string | null;
  }>;
  prescriptions?: Array<any>; // TODO: replace once Prescription model exists
};

export type EmrSummary = {
  patientId: string;
  providerId: string;
  counters: {
    notesDraftCount: number;
    abnormalResultsCount: number;
    unsentCorrespondenceCount: number;
    upcomingAppointmentsCount: number;
    lastVisit: string | null;
    totalVisits: number;
  };
  links: {
    consultations: string;
    notes: string;
    prescriptions: string;
  };
  expansions?: EmrSummaryExpansion;
};

export class EmrService {
  /**
   * Build a lightweight EMR summary payload with counters and navigational links.
   * Optional expansions can be requested via include CSV: consultations, notes, prescriptions.
   */
  static async getPatientSummary(
    providerId: string,
    patientId: string,
    includeCsv?: string
  ): Promise<EmrSummary> {
    const counters = await EmrRepository.getCountersForProviderPatient(providerId, patientId);

    const links = {
      consultations: `/api/provider/patients/${patientId}/emr/consultations`,
      notes: `/api/provider/patients/${patientId}/emr/notes`,
      prescriptions: `/api/provider/patients/${patientId}/emr/prescriptions`,
    };

    const includes = parseEmrIncludes(includeCsv);
    const expansions: EmrSummaryExpansion = {};

    if (includes.includes('consultations')) {
      expansions.consultations = await EmrRepository.getRecentEncountersPreview(providerId, patientId, 5);
    }
    if (includes.includes('notes')) {
      expansions.notes = await EmrRepository.getRecentNotesPreview(providerId, patientId, 5);
    }
    if (includes.includes('prescriptions')) {
      expansions.prescriptions = await EmrRepository.getRecentPrescriptionsPreview(providerId, patientId, 5);
    }

    // Remove empty expansions object if no keys populated
    const hasExpansions =
      expansions.consultations !== undefined ||
      expansions.notes !== undefined ||
      expansions.prescriptions !== undefined;

    return {
      patientId,
      providerId,
      counters,
      links,
      expansions: hasExpansions ? expansions : undefined,
    };
  }
}