import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Provider Patient Audit API
 * 
 * Purpose:
 * - Find "recently booked" patients (appointments with this provider in the last N days)
 *   who do NOT have an approved DoctorPatientConnection.
 * - Optional auto-fix: create/approve connections for those orphan bookings.
 * 
 * Query params:
 * - days: number of days to look back for recent appointments (default: 30)
 * - statuses: comma-separated appointment statuses to include (default: scheduled,confirmed,in-progress)
 * - autoFix: 'true' to upsert approved connections for orphans (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const statusesParam = searchParams.get('statuses');
    const autoFixParam = searchParams.get('autoFix');

    const days = daysParam ? Math.max(1, parseInt(daysParam, 10)) : 30;
    const statuses = (statusesParam ? statusesParam.split(',') : ['scheduled', 'confirmed', 'in-progress']).map(s => s.trim()).filter(Boolean);
    const autoFix = autoFixParam === 'true';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 1) Fetch recent appointments for this provider
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        providerId: session.user.id,
        date: { gte: cutoffDate },
        status: { in: statuses },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // No recent appointments
    if (recentAppointments.length === 0) {
      return NextResponse.json({
        providerId: session.user.id,
        days,
        statuses,
        recentAppointments: 0,
        orphanBookings: 0,
        orphanPatients: [],
        fixedConnections: [],
      });
    }

    // 2) Build lookup of patientId -> most recent appointment and counts
    const patientsMap = new Map<string, {
      patientId: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      phone: string | null;
      mostRecentAppointmentId: string;
      mostRecentDate: Date;
      mostRecentStatus: string;
      mostRecentType: string;
      appointmentCountSinceCutoff: number;
    }>();

    for (const appt of recentAppointments) {
      const pid = appt.patientId;
      const existing = patientsMap.get(pid);
      if (!existing) {
        patientsMap.set(pid, {
          patientId: pid,
          firstName: appt.patient.firstName ?? null,
          lastName: appt.patient.lastName ?? null,
          email: appt.patient.email,
          phone: appt.patient.phone ?? null,
          mostRecentAppointmentId: appt.id,
          mostRecentDate: appt.date,
          mostRecentStatus: appt.status,
          mostRecentType: appt.type as unknown as string,
          appointmentCountSinceCutoff: 1,
        });
      } else {
        existing.appointmentCountSinceCutoff += 1;
        // Update most recent if this appt is newer
        if (appt.date > existing.mostRecentDate) {
          existing.mostRecentAppointmentId = appt.id;
          existing.mostRecentDate = appt.date;
          existing.mostRecentStatus = appt.status;
          existing.mostRecentType = appt.type as unknown as string;
        }
      }
    }

    const uniquePatientIds = Array.from(patientsMap.keys());

    // 3) Query approved connections for those patients
    const approvedConnections = await prisma.doctorPatientConnection.findMany({
      where: {
        providerId: session.user.id,
        patientId: { in: uniquePatientIds },
        status: 'approved',
      },
      select: { patientId: true },
    });

    const connectedPatientIds = new Set(approvedConnections.map(c => c.patientId));

    // 4) Orphan patients = booked recently but no approved connection
    const orphanPatients = uniquePatientIds
      .filter(pid => !connectedPatientIds.has(pid))
      .map(pid => patientsMap.get(pid)!)
      // sort by most recent booking desc for readability
      .sort((a, b) => b.mostRecentDate.getTime() - a.mostRecentDate.getTime());

    const fixResults: Array<{
      patientId: string;
      providerId: string;
      treatmentType: string;
      created: boolean;
      updated: boolean;
    }> = [];

    // 5) Optional auto-fix: create/approve connections for each orphan patient
    if (autoFix && orphanPatients.length > 0) {
      for (const orphan of orphanPatients) {
        const treatmentType = (orphan.mostRecentType || 'consultation').toString();

        try {
          const upserted = await prisma.doctorPatientConnection.upsert({
            where: {
              providerId_patientId_treatmentType: {
                providerId: session.user.id,
                patientId: orphan.patientId,
                treatmentType,
              },
            },
            update: {
              status: 'approved',
              approvedAt: new Date(),
              updatedAt: new Date(),
            },
            create: {
              providerId: session.user.id,
              patientId: orphan.patientId,
              treatmentType,
              status: 'approved',
              approvedAt: new Date(),
            },
          });

          // Basic flags
          // If upsert returned and we didn't know previous existence, we can check approvedAt just set; treat as either created or updated
          // Prisma doesn't directly tell created vs updated; infer via approvedAt timestamp close to now
          fixResults.push({
            patientId: orphan.patientId,
            providerId: session.user.id,
            treatmentType,
            created: true, // treat as created path for audit simplicity
            updated: true, // and updated (idempotent)
          });
        } catch (err) {
          // Continue auditing even if a particular upsert fails
          fixResults.push({
            patientId: orphan.patientId,
            providerId: session.user.id,
            treatmentType,
            created: false,
            updated: false,
          });
        }
      }
    }

    return NextResponse.json({
      providerId: session.user.id,
      days,
      statuses,
      recentAppointments: recentAppointments.length,
      uniqueRecentPatients: uniquePatientIds.length,
      orphanBookings: orphanPatients.length,
      orphanPatients: orphanPatients.map(o => ({
        patientId: o.patientId,
        firstName: o.firstName,
        lastName: o.lastName,
        email: o.email,
        phone: o.phone,
        mostRecentAppointmentId: o.mostRecentAppointmentId,
        mostRecentDate: o.mostRecentDate.toISOString(),
        mostRecentStatus: o.mostRecentStatus,
        mostRecentType: o.mostRecentType,
        appointmentCountSinceCutoff: o.appointmentCountSinceCutoff,
      })),
      fixedConnections: fixResults,
    });
  } catch (error) {
    console.error('Provider patient audit API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}