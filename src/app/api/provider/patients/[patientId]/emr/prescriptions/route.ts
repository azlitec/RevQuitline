import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

/**
 * Simplified Provider EMR Prescriptions API
 * - GET: List prescriptions for a specific patient
 * - POST: Create a new prescription for a patient
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      patientId: patientId,
      providerId: session.user.id
    };

    if (status) {
      where.status = status;
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ prescriptions });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      medicationName, 
      dosage, 
      frequency, 
      duration, 
      instructions, 
      appointmentId 
    } = body;

    if (!medicationName || !dosage || !frequency) {
      return NextResponse.json(
        { error: 'Medication name, dosage, and frequency are required' },
        { status: 400 }
      );
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId: patientId,
        providerId: session.user.id,
        appointmentId: appointmentId || null,
        medicationName: medicationName,
        dosage: dosage,
        frequency: frequency,
        duration: duration || null,
        instructions: instructions || null,
        status: 'active',
        prescribedAt: new Date()
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      }
    });

    return NextResponse.json({ prescription }, { status: 201 });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.patientId;
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      id, 
      medicationName, 
      dosage, 
      frequency, 
      duration, 
      instructions, 
      status 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Prescription ID is required' }, { status: 400 });
    }

    // Verify the prescription belongs to this provider and patient
    const existingPrescription = await prisma.prescription.findFirst({
      where: {
        id: id,
        patientId: patientId,
        providerId: session.user.id
      }
    });

    if (!existingPrescription) {
      return NextResponse.json(
        { error: 'Prescription not found or access denied' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (medicationName !== undefined) updateData.medicationName = medicationName;
    if (dosage !== undefined) updateData.dosage = dosage;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (duration !== undefined) updateData.duration = duration;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (status !== undefined) updateData.status = status;

    const prescription = await prisma.prescription.update({
      where: { id: id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        appointment: {
          select: {
            id: true,
            title: true,
            date: true
          }
        }
      }
    });

    return NextResponse.json({ prescription });
  } catch (error) {
    console.error('Error updating prescription:', error);
    return NextResponse.json(
      { error: 'Failed to update prescription' },
      { status: 500 }
    );
  }
}