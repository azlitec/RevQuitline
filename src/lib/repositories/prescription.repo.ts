import { prisma } from '@/lib/db';
import { Prisma, PrescriptionStatus } from '@prisma/client';

export interface PrescriptionCreateInput {
  patientId: string;
  providerId: string;
  appointmentId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills?: number;
  instructions: string;
  status?: PrescriptionStatus;
  prescribedDate?: Date;
  startDate: Date;
  endDate?: Date | null;
  pharmacy?: string | null;
  pharmacyPhone?: string | null;
  notes?: string | null;
}

export interface PrescriptionUpdateInput {
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
  status?: PrescriptionStatus;
  startDate?: Date;
  endDate?: Date | null;
  pharmacy?: string | null;
  pharmacyPhone?: string | null;
  notes?: string | null;
}

export interface PatientPrescriptionQueryOptions {
  status?: PrescriptionStatus;
  limit?: number;
  offset?: number;
}

export interface ProviderPrescriptionFilters {
  status?: PrescriptionStatus;
  dateRange?: { from?: Date | string; to?: Date | string };
  patientId?: string;
  limit?: number;
  offset?: number;
}

export class PrescriptionRepository {
  /**
   * Create a new prescription record.
   * Includes patient, provider, and appointment minimal fields to avoid N+1 in consumers.
   */
  static async createPrescription(data: PrescriptionCreateInput) {
    const created = await prisma.prescription.create({
      data: {
        patientId: data.patientId,
        providerId: data.providerId,
        appointmentId: data.appointmentId ?? undefined,
        medicationName: data.medicationName,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        quantity: data.quantity,
        refills: data.refills ?? 0,
        instructions: data.instructions,
        status: data.status ?? 'DRAFT',
        prescribedDate: data.prescribedDate ?? new Date(),
        startDate: data.startDate,
        endDate: data.endDate ?? undefined,
        pharmacy: data.pharmacy ?? undefined,
        pharmacyPhone: data.pharmacyPhone ?? undefined,
        notes: data.notes ?? undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        appointment: { select: { id: true, date: true, title: true } },
      },
    });
    return created;
  }

  /**
   * Get a prescription by id with ownership context.
   */
  static async getPrescriptionById(id: string) {
    return prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        appointment: { select: { id: true, date: true, title: true } },
      },
    });
  }

  /**
   * List prescriptions by patient with optional status and pagination.
   */
  static async getPrescriptionsByPatient(patientId: string, options?: PatientPrescriptionQueryOptions) {
    const where: Prisma.PrescriptionWhereInput = { patientId };
    if (options?.status) where.status = options.status;

    const take = options?.limit ?? 20;
    const skip = options?.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        orderBy: { prescribedDate: 'desc' },
        skip,
        take,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
          appointment: { select: { id: true, date: true, title: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return { items, total, limit: take, offset: skip };
  }

  /**
   * List prescriptions authored by a provider with filters and pagination.
   */
  static async getPrescriptionsByProvider(providerId: string, filters?: ProviderPrescriptionFilters) {
    const where: Prisma.PrescriptionWhereInput = { providerId };
    if (filters?.status) where.status = filters.status;
    if (filters?.patientId) where.patientId = filters.patientId;

    if (filters?.dateRange) {
      const range: Prisma.DateTimeFilter = {};
      if (filters.dateRange.from) {
        range.gte = typeof filters.dateRange.from === 'string' ? new Date(filters.dateRange.from) : filters.dateRange.from;
      }
      if (filters.dateRange.to) {
        range.lte = typeof filters.dateRange.to === 'string' ? new Date(filters.dateRange.to) : filters.dateRange.to;
      }
      where.prescribedDate = range;
    }

    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const [items, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        orderBy: { prescribedDate: 'desc' },
        skip,
        take,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          provider: { select: { id: true, firstName: true, lastName: true } },
          appointment: { select: { id: true, date: true, title: true } },
        },
      }),
      prisma.prescription.count({ where }),
    ]);

    return { items, total, limit: take, offset: skip };
  }

  /**
   * Update prescription fields (partial).
   */
  static async updatePrescription(id: string, data: PrescriptionUpdateInput) {
    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        medicationName: data.medicationName ?? undefined,
        dosage: data.dosage ?? undefined,
        frequency: data.frequency ?? undefined,
        duration: data.duration ?? undefined,
        quantity: data.quantity ?? undefined,
        refills: data.refills ?? undefined,
        instructions: data.instructions ?? undefined,
        status: data.status ?? undefined,
        startDate: data.startDate ?? undefined,
        endDate: data.endDate ?? undefined,
        pharmacy: data.pharmacy ?? undefined,
        pharmacyPhone: data.pharmacyPhone ?? undefined,
        notes: data.notes ?? undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        appointment: { select: { id: true, date: true, title: true } },
      },
    });
    return updated;
  }

  /**
   * Cancel a prescription: set status to CANCELLED, stamp endDate, append reason to notes.
   */
  static async cancelPrescription(id: string, reason: string) {
    const existing = await prisma.prescription.findUnique({
      where: { id },
      select: { notes: true, status: true },
    });
    if (!existing) {
      throw Object.assign(new Error('Prescription not found'), { status: 404 });
    }
    if (existing.status === 'CANCELLED') {
      return prisma.prescription.findUnique({ where: { id } });
    }
    const cancellationNote = `[Cancelled ${new Date().toISOString()}] ${reason}`;
    const combinedNotes =
      existing.notes && existing.notes.length > 0 ? `${existing.notes}\n${cancellationNote}` : cancellationNote;

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
        notes: combinedNotes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        provider: { select: { id: true, firstName: true, lastName: true } },
        appointment: { select: { id: true, date: true, title: true } },
      },
    });

    return updated;
  }

  /**
   * Batch job: expire prescriptions where endDate is in the past and status is ACTIVE.
   * Returns count of updated rows.
   */
  static async expirePrescriptions() {
    const now = new Date();
    const result = await prisma.prescription.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    return result.count;
  }
}