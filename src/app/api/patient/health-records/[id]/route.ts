import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const recordId = params.id;

    // Fetch the specific health record with full details
    const healthRecord = await prisma.healthRecord.findFirst({
      where: {
        id: recordId,
        patientId: session.user.id as string
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true
          }
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true
          }
        }
      }
    });

    if (!healthRecord) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    return NextResponse.json(healthRecord);

  } catch (error) {
    console.error('Health record details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}