import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/index';
// SECURITY: add centralized validation + error response utilities
import { z } from 'zod';
import { validateQuery, validateBody } from '@/lib/api/validate';
import { errorResponse } from '@/lib/api/response';
import { stripHtml } from '@/lib/security/sanitize';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.isProvider) {
      // SECURITY: standardized error format without leaking details
      return errorResponse('Unauthorized', 401);
    }

    // SECURITY: validate query parameters
    const GetQuerySchema = z.object({
      appointmentId: z.string().min(1, 'appointmentId is required'),
    });
    const parsed = validateQuery(request, GetQuerySchema);
    if ('error' in parsed) return parsed.error;
    const { appointmentId } = parsed.data;

    // Check if the appointment belongs to the current user
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: session.user.id,
      },
    });

    if (!appointment) {
      return errorResponse('Appointment not found', 404);
    }

    // Get the intake form data
    const intakeForm = await prisma.intakeForm.findFirst({
      where: {
        appointmentId: appointmentId,
      },
    });

    if (!intakeForm) {
      return NextResponse.json({ formData: null, currentStep: 1 });
    }

    return NextResponse.json({
      formData: intakeForm.formData,
      currentStep: intakeForm.currentStep,
      completed: intakeForm.completed,
      completedAt: intakeForm.completedAt,
    });

  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.isProvider) {
      return errorResponse('Unauthorized', 401);
    }

    // SECURITY: validate body with Zod
    const BodySchema = z.object({
      appointmentId: z.string().min(1, 'appointmentId is required'),
      // Accept arbitrary intake form fields but sanitize strings server-side
      formData: z.record(z.any()).default({}),
      currentStep: z.number().int().min(1).max(5),
      completed: z.boolean().optional(),
    });
    const parsedBody = await validateBody(request, BodySchema);
    if ('error' in parsedBody) return parsedBody.error;
    const { appointmentId, formData, currentStep, completed } = parsedBody.data;

    // Check if the appointment belongs to the current user and is a quitline session
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: session.user.id,
        type: 'quitline_smoking_cessation', // Only allow intake forms for quitline sessions
      },
    });

    if (!appointment) {
      return errorResponse('Appointment not found or not eligible for intake form', 404);
    }

    // Check if intake form already exists
    const existingForm = await prisma.intakeForm.findFirst({
      where: {
        appointmentId: appointmentId,
      },
    });

    // Use the completed field from request body, or infer completion when final step reached
    const isCompleted = completed !== undefined ? completed : currentStep >= 5;

    // SECURITY: sanitize all text fields to prevent stored XSS
    const sanitizeValue = (v: any): any => {
      if (typeof v === 'string') return stripHtml(v).trim();
      if (Array.isArray(v)) return v.map(sanitizeValue);
      if (v && typeof v === 'object') {
        return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, sanitizeValue(val)]));
      }
      return v;
    };
    const safeFormData = sanitizeValue(formData);
    if (existingForm) {
      // Update existing form
      const updatedForm = await prisma.intakeForm.update({
        where: {
          id: existingForm.id,
        },
        data: {
          // SECURITY: persist sanitized form data
          formData: safeFormData,
          currentStep: currentStep,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        form: updatedForm,
        message: isCompleted ? 'Intake form completed successfully!' : 'Progress saved successfully!',
      });
    } else {
      // Create new form
      const newForm = await prisma.intakeForm.create({
        data: {
          appointmentId: appointmentId,
          patientId: session.user.id,
          // SECURITY: persist sanitized form data
          formData: safeFormData,
          currentStep: currentStep,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });


      return NextResponse.json({
        success: true,
        form: newForm,
        message: isCompleted ? 'Intake form completed successfully!' : 'Progress saved successfully!',
      });
    }

  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}