import { prisma } from '@/lib/db';
import type {
  EmrConsultationListQuery,
  EmrConsultationCreate,
  EmrConsultationUpdate,
} from '@/lib/validators/emr';

export class ConsultationRepository {
  /**
   * List encounters (consultations) for a provider↔patient with pagination and optional filters.
   * Returns items with latest note excerpt and total count.
   */
  static async list(
    providerId: string,
    patientId: string,
    query: EmrConsultationListQuery
  ): Promise<{
    items: Array<{
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
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize, status, dateFrom, dateTo } = query;

    const where: any = {
      providerId,
      patientId,
    };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) where.startTime.lte = new Date(dateTo);
    }

    const [encounters, total] = await Promise.all([
      prisma.encounter.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: page * pageSize,
        take: pageSize,
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
      }),
      prisma.encounter.count({ where }),
    ]);

    const items = encounters.map((e) => {
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

    return { items, total, page, pageSize };
  }

  /**
   * Fetch an encounter by id (for transition checks).
   */
  static async getById(id: string): Promise<{
    id: string;
    patientId: string;
    providerId: string;
    status: string;
    appointmentId: string | null;
  } | null> {
    const enc = await prisma.encounter.findUnique({
      where: { id },
      select: { id: true, patientId: true, providerId: true, status: true, appointmentId: true },
    });
    return enc ?? null;
  }

  /**
   * Create a new encounter (consultation).
   * providerId/patientId are enforced by service/controller (not from body).
   */
  static async create(
    providerId: string,
    patientId: string,
    body: EmrConsultationCreate
  ): Promise<{
    id: string;
    patientId: string;
    providerId: string;
    appointmentId: string | null;
    type: string;
    mode: string;
    startTime: string;
    endTime: string | null;
    location: string | null;
    renderingProviderId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const created = await prisma.encounter.create({
      data: {
        patientId,
        providerId,
        appointmentId: body.appointmentId ?? null,
        type: body.type,
        mode: body.mode as any,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        location: body.location ?? null,
        renderingProviderId: body.renderingProviderId ?? null,
        status: body.status as any,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        appointmentId: true,
        type: true,
        mode: true,
        startTime: true,
        endTime: true,
        location: true,
        renderingProviderId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...created,
      startTime: created.startTime.toISOString(),
      endTime: created.endTime ? created.endTime.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update an encounter (consultation).
   */
  static async update(
    id: string,
    body: EmrConsultationUpdate
  ): Promise<{
    id: string;
    patientId: string;
    providerId: string;
    appointmentId: string | null;
    type: string;
    mode: string;
    startTime: string;
    endTime: string | null;
    location: string | null;
    renderingProviderId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const updated = await prisma.encounter.update({
      where: { id },
      data: {
        patientId: body.patientId ?? undefined,
        appointmentId: body.appointmentId ?? undefined,
        type: body.type ?? undefined,
        mode: (body.mode as any) ?? undefined,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        location: body.location ?? undefined,
        renderingProviderId: body.renderingProviderId ?? undefined,
        status: (body.status as any) ?? undefined,
      },
      select: {
        id: true,
        patientId: true,
        providerId: true,
        appointmentId: true,
        type: true,
        mode: true,
        startTime: true,
        endTime: true,
        location: true,
        renderingProviderId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime ? updated.endTime.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}