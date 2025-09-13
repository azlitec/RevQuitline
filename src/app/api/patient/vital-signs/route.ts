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

    const vitalSigns = await prisma.vitalSign.findMany({
      where: {
        patientId: session.user.id as string
      },
      orderBy: {
        recordedAt: 'desc'
      },
      skip,
      take: limit
    });

    const totalRecords = await prisma.vitalSign.count({
      where: {
        patientId: session.user.id as string
      }
    });

    return NextResponse.json({
      vitalSigns,
      pagination: {
        page,
        limit,
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('Vital signs API error:', error);
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

    const body = await request.json();
    
    const vitalSign = await prisma.vitalSign.create({
      data: {
        patientId: session.user.id as string,
        recordedAt: new Date(body.recordedAt),
        bloodPressure: body.bloodPressure,
        heartRate: body.heartRate,
        oxygenSaturation: body.oxygenSaturation,
        respiratoryRate: body.respiratoryRate,
        temperature: body.temperature,
        weight: body.weight,
        height: body.height,
        bmi: body.bmi
      }
    });

    return NextResponse.json(vitalSign);

  } catch (error) {
    console.error('Create vital sign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}