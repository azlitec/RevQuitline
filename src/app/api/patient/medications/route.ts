import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const medications = await prisma.medication.findMany({
      where: {
        patientId: session.user.id as string
      },
      include: {
        prescribedBy: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      },
      skip,
      take: limit
    });

    const totalRecords = await prisma.medication.count({
      where: {
        patientId: session.user.id as string
      }
    });

    return NextResponse.json({
      medications,
      pagination: {
        page,
        limit,
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('Medications API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only providers can prescribe medications
    if (!session.user.isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    
    const medication = await prisma.medication.create({
      data: {
        name: body.name,
        dosage: body.dosage,
        frequency: body.frequency,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        prescribedById: session.user.id as string,
        patientId: body.patientId,
        instructions: body.instructions,
        sideEffects: body.sideEffects,
        status: body.status || 'active'
      },
      include: {
        prescribedBy: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return NextResponse.json(medication);

  } catch (error) {
    console.error('Create medication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}