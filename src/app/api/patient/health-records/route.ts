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

    // Check if user is a patient
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const healthRecords = await prisma.healthRecord.findMany({
      where: {
        patientId: session.user.id as string
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: limit
    });

    const totalRecords = await prisma.healthRecord.count({
      where: {
        patientId: session.user.id as string
      }
    });

    return NextResponse.json({
      healthRecords,
      pagination: {
        page,
        limit,
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('Health records API error:', error);
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

    // Only providers can create health records
    if (!session.user.isProvider) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    
    const healthRecord = await prisma.healthRecord.create({
      data: {
        title: body.title,
        description: body.description,
        type: body.type,
        date: new Date(body.date),
        providerId: session.user.id as string,
        patientId: body.patientId,
        vitalSigns: body.vitalSigns,
        medications: body.medications,
        diagnosis: body.diagnosis,
        treatment: body.treatment,
        notes: body.notes,
        attachments: body.attachments || []
      },
      include: {
        provider: {
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

    return NextResponse.json(healthRecord);

  } catch (error) {
    console.error('Create health record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}