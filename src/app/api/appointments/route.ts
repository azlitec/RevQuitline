import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { validateQuery, validateBody } from '@/lib/api/validate';
import { createAppointmentSchema, AppointmentStatusEnum } from '@/lib/validators/appointment';
import { PaginationSchema } from '@/lib/validators/common';
import { jsonList, jsonEntity } from '@/lib/api/response';
import { errorResponse } from '@/lib/api/response';
import type { ServiceType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return errorResponse('Unauthorized', 401);
    }

    // Validate query params with Zod
    const GetQuerySchema = z.object({ status: z.string().optional() }).merge(PaginationSchema);
    const parsed = validateQuery(request, GetQuerySchema);
    if ('error' in parsed) return parsed.error;
    const { status, page = 0, limit = 20 } = parsed.data as z.infer<typeof GetQuerySchema>;
    const skip = page * limit;

    const whereClause: any = {};

    // Scope by role
    if (session.user.isProvider) {
      whereClause.providerId = session.user.id;
    } else {
      whereClause.patientId = session.user.id;
    }
    


    // Status filter: allow CSV and validate against enum options
    if (status && status !== 'all') {
      const allowed = new Set(AppointmentStatusEnum.options);
      const statuses = status.split(',').map(s => s.trim()).filter(s => allowed.has(s as any));
      if (statuses.length > 1) {
        whereClause.status = { in: statuses };
      } else if (statuses.length === 1) {
        whereClause.status = statuses[0];
      }
    }

    // Supabase pgbouncer is configured with a low connection_limit (e.g., 1).
    // Avoid concurrent queries to prevent pool exhaustion and 500 errors.
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        provider: { select: { id: true, firstName: true, lastName: true, email: true, specialty: true } },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    });
    const total = await prisma.appointment.count({ where: whereClause });
    


    // Standardized list envelope
    return jsonList(request, { items: appointments, total, page, pageSize: limit }, 200);
  } catch (error: any) {
    console.error('Appointments API error:', { message: error?.message });
    return errorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return errorResponse('Unauthorized', 401);
    }

    // Validate body with Zod
    const parsed = await validateBody(request, createAppointmentSchema);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;

    // Determine patientId based on role
    let patientId: string;
    if (session.user.isProvider || session.user.isAdmin) {
      // Provider/Admin must supply patientId explicitly
      if (!body.patientId) return errorResponse('patientId is required for provider/admin', 400);
      patientId = body.patientId;
    } else {
      // Patient booking: override patientId to session user
      patientId = session.user.id;
    }

    // Default service name/price based on type (business logic)
    let finalServiceName = body.serviceName;
    let finalPrice = body.price;
    if (body.type === 'quitline_smoking_cessation') {
      finalServiceName = finalServiceName || 'Quitline Free-Smoking Session (INRT)';
      finalPrice = finalPrice || 150;
    }

    // Create appointment
    const appointment = (await prisma.appointment.create({
      data: {
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        duration: body.duration ?? 30,
        type: ((body.type ?? 'consultation') as ServiceType),
        serviceName: finalServiceName,
        price: finalPrice,
        status: 'scheduled',
        meetingLink: body.meetingLink,
        providerId: body.providerId,
        patientId,
      },
      include: {
        provider: { select: { firstName: true, lastName: true, specialty: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
    // Security note: casting to any is used here solely to access included relations for composing notification messages.
    // Data returned remains sanitized and we do not log PHI in errors. Consider defining a typed payload if stricter typing is desired.
    })) as any;

    // Ensure doctor-patient connection exists and is approved
    try {
      const connectionTreatmentType = appointment.type || 'consultation';
      await prisma.doctorPatientConnection.upsert({
        where: {
          providerId_patientId_treatmentType: {
            providerId: appointment.providerId,
            patientId: appointment.patientId,
            treatmentType: connectionTreatmentType,
          },
        },
        update: {
          status: 'approved',
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          providerId: appointment.providerId,
          patientId: appointment.patientId,
          treatmentType: connectionTreatmentType,
          status: 'approved',
          approvedAt: new Date(),
        },
      });
    } catch (connErr) {
      console.error('Failed to ensure doctor-patient connection:', { message: (connErr as any)?.message });
    }

    // Notifications (non-blocking, lazy import to avoid import-time initialization issues)
    try {
      const { NotificationService } = await import('@/lib/notifications/notificationService');
      await NotificationService.createNotification(
        appointment.patientId,
        'appointment',
        'Appointment Scheduled',
        `Your appointment "${appointment.title}" has been scheduled for ${new Date(appointment.date).toLocaleString()}`,
        'medium',
        appointment.meetingLink || undefined
      );
      await NotificationService.createNotification(
        appointment.providerId,
        'appointment',
        'New Appointment Scheduled',
        `You have a new appointment "${appointment.title}" scheduled for ${new Date(appointment.date).toLocaleString()} with ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        'medium',
        appointment.meetingLink || undefined
      );
    } catch (notificationError) {
      console.error('Failed to create appointment notifications:', { message: (notificationError as any)?.message });
    }

    // Standardized entity envelope
    return jsonEntity(request, appointment, 201);
  } catch (error: any) {
    console.error('Create appointment error:', { message: error?.message });
    return errorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return errorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);
    const appointmentId = url.pathname.split('/').pop();
    if (!appointmentId) {
      return errorResponse('Appointment ID is required', 400);
    }

    // Validate body (status only)
    const PatchSchema = z.object({ status: AppointmentStatusEnum });
    const parsed = await validateBody(request, PatchSchema);
    if ('error' in parsed) return parsed.error;
    const { status: newStatus } = (parsed as { data: z.infer<typeof PatchSchema> }).data;
    
    // Permission: providers can only update their own appointments
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: true, patient: true },
    });
    if (!existingAppointment) {
      return errorResponse('Appointment not found', 404);
    }
    if (session.user.isProvider && existingAppointment.providerId !== session.user.id) {
      return errorResponse('Insufficient permissions', 403);
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: newStatus, updatedAt: new Date() },
      include: {
        provider: { select: { firstName: true, lastName: true, email: true, specialty: true } },
        patient: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // Notification (non-blocking, lazy import to avoid import-time initialization issues)
    try {
      const notificationRecipientId = session.user.isProvider ? existingAppointment.patientId : existingAppointment.providerId;
      const { NotificationService } = await import('@/lib/notifications/notificationService');
      await NotificationService.createNotification(
        notificationRecipientId,
        'appointment',
        'Appointment Status Updated',
        `Your appointment "${existingAppointment.title}" has been updated to ${newStatus} by ${session.user.name || 'the user'}`,
        'medium',
        existingAppointment.meetingLink || undefined
      );
    } catch (notificationError) {
      console.error('Failed to create status change notification:', { message: (notificationError as any)?.message });
    }

    return jsonEntity(request, updatedAppointment, 200);
  } catch (error: any) {
    console.error('Update appointment status error:', { message: error?.message });
    return errorResponse('Internal server error', 500);
  }
}