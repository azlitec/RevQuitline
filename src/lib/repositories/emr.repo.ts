import { prisma } from '@/lib/db';

export type EmrCounters = {
  notesDraftCount: number;
  abnormalResultsCount: number;
  unsentCorrespondenceCount: number;
  upcomingAppointmentsCount: number;
  lastVisit: string | null;
  totalVisits: number;
};

export class EmrRepository {
  /**
   * Compute lightweight EMR counters scoped to a provider+patient relationship.
   * - notesDraftCount: count draft ProgressNotes where note.encounter.providerId = providerId
   * - abnormalResultsCount: count InvestigationResults flagged abnormal/critical for provider+patient
   * - unsentCorrespondenceCount: count Correspondence unsent for provider+patient
   * - upcomingAppointmentsCount: scheduled/confirmed/in-progress appointments for provider+patient
   * - lastVisit: latest completed appointment date
   * - totalVisits: count of completed appointments for provider+patient
   */
  static async getCountersForProviderPatient(providerId: string, patientId: string): Promise<EmrCounters> {
    const [
      notesDraftCount,
      abnormalResultsCount,
      unsentCorrespondenceCount,
      upcomingAppointmentsCount,
      lastCompletedAppointment,
      totalVisits,
    ] = await Promise.all([
      prisma.progressNote.count({
        where: {
          patientId,
          status: 'draft' as any,
          encounter: { providerId },
        },
      }),
      prisma.investigationResult.count({
        where: {
          interpretation: { in: ['abnormal', 'critical'] as any },
          order: {
            patientId,
            providerId,
          },
        },
      }),
      prisma.correspondence.count({
        where: {
          patientId,
          sentAt: null,
          encounter: { providerId },
        },
      }),
      prisma.appointment.count({
        where: {
          providerId,
          patientId,
          status: { in: ['scheduled', 'confirmed', 'in-progress'] as any },
        },
      }),
      prisma.appointment.findFirst({
        where: {
          providerId,
          patientId,
          status: 'completed' as any,
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
      prisma.appointment.count({
        where: {
          providerId,
          patientId,
          status: 'completed' as any,
        },
      }),
    ]);

    return {
      notesDraftCount,
      abnormalResultsCount,
      unsentCorrespondenceCount,
      upcomingAppointmentsCount,
      lastVisit: lastCompletedAppointment?.date ? lastCompletedAppointment.date.toISOString() : null,
      totalVisits,
    };
  }

  /**
   * Optional: Preview recent encounters for EMR summary expansions.
   * Returns last N encounters (default 5) with latest note summary excerpt.
   */
  static async getRecentEncountersPreview(providerId: string, patientId: string, limit = 5) {
    const encounters = await prisma.encounter.findMany({
      where: {
        providerId,
        patientId,
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        mode: true,
        startTime: true,
        endTime: true,
        status: true,
        progressNotes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, summary: true, updatedAt: true },
        },
      },
    });

    return encounters.map((e) => {
      const latest = e.progressNotes?.[0] ?? null;
      return {
        id: e.id,
        type: e.type,
        mode: e.mode,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        status: e.status,
        latestNote: latest
          ? {
              id: latest.id,
              status: latest.status,
              summary: latest.summary ?? null,
              updatedAt: latest.updatedAt.toISOString(),
            }
          : null,
      };
    });
  }

  /**
   * Optional: Preview recent prescriptions (anticipates future Prescription model).
   * If Prescription model exists, this will need adjustment. Placeholder returns empty array.
   */
  static async getRecentPrescriptionsPreview(_providerId: string, _patientId: string, _limit = 5) {
    // TODO: Implement when Prescription model is available in Prisma schema.
    return [];
  }

  /**
   * Optional: Preview recent notes (ProgressNotes) for EMR summary expansions.
   */
  static async getRecentNotesPreview(providerId: string, patientId: string, limit = 5) {
    const notes = await prisma.progressNote.findMany({
      where: {
        patientId,
        encounter: { providerId },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        encounterId: true,
        status: true,
        summary: true,
        updatedAt: true,
        finalizedAt: true,
      },
    });

    return notes.map((n) => ({
      id: n.id,
      encounterId: n.encounterId,
      status: n.status,
      summary: n.summary ?? null,
      updatedAt: n.updatedAt.toISOString(),
      finalizedAt: n.finalizedAt ? n.finalizedAt.toISOString() : null,
    }));
  }
}