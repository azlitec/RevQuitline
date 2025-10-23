import { prisma } from '@/lib/db';
import { PrescriptionRepository } from '@/lib/repositories/prescription.repo';
import { validateCreate, validateUpdate } from '@/lib/validators/prescription';
import { NotificationService } from '@/lib/notifications/notificationService';
import { PrescriptionStatus } from '@prisma/client';

export class PrescriptionService {
  /**
   * Validates a prescription payload with safety checks.
   * Returns normalized DTOs or throws ZodError shaped by controllers.
   */
  static validatePrescription(input: unknown, mode: 'create' | 'update' = 'create') {
    if (mode === 'create') {
      return validateCreate(input);
    } else {
      return validateUpdate(input);
    }
  }

  /**
   * Create a prescription after validation.
   * - Performs basic interaction checks (warning only) before create.
   * - Sends notification to patient on successful creation when status becomes ACTIVE.
   */
  static async createPrescription(
    providerId: string,
    patientId: string,
    input: unknown
  ) {
    const dto = this.validatePrescription(input, 'create') as ReturnType<typeof validateCreate>;

    // Convert ISO strings to Date
    const startDate = new Date((dto as any).startDate);
    const endDate = (dto as any).endDate ? new Date((dto as any).endDate) : undefined;
    const prescribedDate = (dto as any).prescribedDate ? new Date((dto as any).prescribedDate) : new Date();

    // Interaction warnings (do not block create; controller may choose to surface warnings)
    const interactionWarnings = await this.checkForInteractions(patientId, (dto as any).medicationName);

    const created = await PrescriptionRepository.createPrescription({
      patientId,
      providerId,
      appointmentId: (dto as any).appointmentId,
      medicationName: (dto as any).medicationName,
      dosage: (dto as any).dosage,
      frequency: (dto as any).frequency,
      duration: (dto as any).duration,
      quantity: (dto as any).quantity,
      refills: (dto as any).refills,
      instructions: (dto as any).instructions,
      status: (dto as any).status as PrescriptionStatus,
      prescribedDate,
      startDate,
      endDate,
      pharmacy: (dto as any).pharmacy,
      pharmacyPhone: (dto as any).pharmacyPhone,
      notes: (dto as any).notes,
    });

    // Notify patient if prescription is ACTIVE
    if (created.status === 'ACTIVE') {
      const providerName =
        [created.provider?.firstName, created.provider?.lastName].filter(Boolean).join(' ') || 'Your provider';
      await NotificationService.createNotification(
        patientId,
        'alert',
        'New Prescription',
        `${providerName} prescribed ${created.medicationName}. Please review your instructions.`,
        'high',
        '/patient/prescriptions'
      );
    }

    return { prescription: created, warnings: interactionWarnings };
  }

  /**
   * Returns a patient's prescription history (provider-scoped). Ensures approved provider-patient link.
   */
  static async getPrescriptionHistory(patientId: string, providerId: string) {
    // Enforce approved provider↔patient relationship
    const link = await prisma.doctorPatientConnection.findFirst({
      where: { providerId, patientId, status: 'approved' },
      select: { id: true },
    });
    if (!link) {
      const err: any = new Error('No approved provider-patient link');
      err.status = 403;
      throw err;
    }

    const { items } = await PrescriptionRepository.getPrescriptionsByPatient(patientId, {
      limit: 100,
      offset: 0,
    });

    return { items };
  }

  /**
   * Update only status with minimal validation and ownership verification.
   * - Provider must own the prescription (enforced by controller by passing providerId).
   * - If setting to CANCELLED, consider using cancelPrescription for reason auditing.
   */
  static async updatePrescriptionStatus(
    id: string,
    status: PrescriptionStatus,
    userId: string,
    role: 'PROVIDER' | 'ADMIN' | 'CLERK' | 'USER'
  ) {
    const existing = await prisma.prescription.findUnique({
      where: { id },
      select: { id: true, providerId: true, patientId: true, status: true },
    });
    if (!existing) {
      const err: any = new Error('Prescription not found');
      err.status = 404;
      throw err;
    }

    // Only providers (owner) or admins can change status
    if (role === 'PROVIDER' && existing.providerId !== userId) {
      const err: any = new Error('Forbidden: not owner');
      err.status = 403;
      throw err;
    }
    if (status === 'CANCELLED') {
      // encourage use of cancelPrescription with reason
      const err: any = new Error('Use cancelPrescription to cancel with reason');
      err.status = 400;
      throw err;
    }

    const updated = await PrescriptionRepository.updatePrescription(id, { status });

    // Notify patient on significant state transitions
    if (status === 'COMPLETED' || status === 'EXPIRED') {
      const label = status === 'COMPLETED' ? 'Prescription Completed' : 'Prescription Expired';
      await NotificationService.createNotification(
        (updated as any).patientId,
        'info',
        label,
        `${(updated as any).medicationName} is now ${status.toLowerCase()}.`,
        'medium',
        '/patient/prescriptions'
      );
    }

    return { prescription: updated };
  }

  /**
   * Cancel a prescription with reason and notify patient.
   */
  static async cancelPrescription(id: string, reason: string, userId: string, role: 'PROVIDER' | 'ADMIN') {
    const existing = await prisma.prescription.findUnique({
      where: { id },
      select: { id: true, providerId: true, patientId: true, medicationName: true, status: true },
    });
    if (!existing) {
      const err: any = new Error('Prescription not found');
      err.status = 404;
      throw err;
    }
    if (role === 'PROVIDER' && existing.providerId !== userId) {
      const err: any = new Error('Forbidden: not owner');
      err.status = 403;
      throw err;
    }

    const updated = await PrescriptionRepository.cancelPrescription(id, reason);
    if (!updated) {
      const err: any = new Error('Cancellation failed');
      err.status = 500;
      throw err;
    }

    // Notify patient of cancellation
    await NotificationService.createNotification(
      (updated as any).patientId,
      'alert',
      'Prescription Cancelled',
      `${(updated as any).medicationName} was cancelled. Reason: ${reason}`,
      'high',
      '/patient/prescriptions'
    );

    return { prescription: updated };
  }

  /**
   * Basic interaction checks against active prescriptions:
   * - Duplicate active prescription of same medication
   * - More than N active prescriptions (polypharmacy) -> warning
   * NOTE: For advanced clinical decision support, integrate a dedicated interaction engine.
   */
  static async checkForInteractions(patientId: string, newMedication: string): Promise<string[]> {
    const warnings: string[] = [];
    const active = await prisma.prescription.findMany({
      where: { patientId, status: 'ACTIVE' },
      select: { id: true, medicationName: true, startDate: true, endDate: true },
    });

    const dup = active.find(
      (p) => (p.medicationName || '').toLowerCase() === newMedication.toLowerCase()
    );
    if (dup) {
      warnings.push(
        `Patient already has an active prescription for ${newMedication}. Consider completing or cancelling the prior one.`
      );
    }

    if (active.length >= 5) {
      warnings.push('Patient has 5 or more active prescriptions. Review for potential interactions.');
    }

    return warnings;
  }

  /**
   * Generate a printable "PDF" document. Implementation returns an HTML buffer suitable for print-to-PDF.
   * A dedicated PDF generator can replace this to render a real PDF binary.
   */
  static async generatePrescriptionPDF(
    id: string
  ): Promise<{ filename: string; contentType: string; content: Buffer }> {
    const p = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true } },
        provider: { select: { firstName: true, lastName: true, licenseNumber: true } },
        appointment: { select: { id: true, date: true, title: true } },
      },
    });
    if (!p) {
      const err: any = new Error('Prescription not found');
      err.status = 404;
      throw err;
    }

    const patientName = [p.patient?.firstName, p.patient?.lastName].filter(Boolean).join(' ');
    const providerName = [p.provider?.firstName, p.provider?.lastName].filter(Boolean).join(' ');
    const appointmentLine = p.appointment
      ? `<div><span class="label">Appointment:</span><span class="value">${p.appointment.title || p.appointment.id} on ${new Date(p.appointment.date as any).toLocaleString()}</span></div>`
      : '';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Prescription ${p.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 16px 0 8px; }
    .section { margin-bottom: 16px; }
    .label { color: #6b7280; width: 160px; display: inline-block; }
    .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    .foot { margin-top: 24px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Prescription</h1>
  <div class="section">
    <div><span class="label">Prescription ID:</span><span class="value">${p.id}</span></div>
    <div><span class="label">Status:</span><span class="value">${p.status}</span></div>
    <div><span class="label">Prescribed Date:</span><span class="value">${new Date(p.prescribedDate as any).toLocaleString()}</span></div>
  </div>
  <h2>Patient</h2>
  <div class="section">
    <div><span class="label">Name:</span><span class="value">${patientName || '-'}</span></div>
    <div><span class="label">DOB:</span><span class="value">${p.patient?.dateOfBirth ? new Date(p.patient.dateOfBirth as any).toLocaleDateString() : '-'}</span></div>
  </div>
  <h2>Provider</h2>
  <div class="section">
    <div><span class="label">Name:</span><span class="value">${providerName || '-'}</span></div>
    <div><span class="label">License #:</span><span class="value">${p.provider?.licenseNumber || '-'}</span></div>
  </div>
  <h2>Medication</h2>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Quantity</th>
        <th>Refills</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${p.medicationName}</td>
        <td>${p.dosage}</td>
        <td>${p.frequency}</td>
        <td>${p.duration}</td>
        <td>${p.quantity}</td>
        <td>${p.refills}</td>
      </tr>
    </tbody>
  </table>
  <h2>Instructions</h2>
  <div class="section">
    <div class="value">${p.instructions || '-'}</div>
  </div>
  <h2>Pharmacy</h2>
  <div class="section">
    <div><span class="label">Pharmacy:</span><span class="value">${p.pharmacy || '-'}</span></div>
    <div><span class="label">Phone:</span><span class="value">${p.pharmacyPhone || '-'}</span></div>
  </div>
  <h2>Schedule</h2>
  <div class="section">
    <div><span class="label">Start Date:</span><span class="value">${new Date(p.startDate as any).toLocaleDateString()}</span></div>
    <div><span class="label">End Date:</span><span class="value">${p.endDate ? new Date(p.endDate as any).toLocaleDateString() : '-'}</span></div>
    ${appointmentLine}
  </div>
  <h2>Notes</h2>
  <div class="section">
    <div class="value">${p.notes || '-'}</div>
  </div>
  <div class="foot">
    Generated by Quitline Telehealth • ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
    const filename = `prescription-${p.id}.html`;
    return { filename, contentType: 'text/html', content: Buffer.from(html) };
  }
}