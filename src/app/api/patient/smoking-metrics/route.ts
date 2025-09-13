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

    const smokingMetrics = await prisma.smokingMetric.findMany({
      where: {
        patientId: session.user.id as string
      },
      orderBy: {
        recordedAt: 'desc'
      },
      skip,
      take: limit
    });

    const totalRecords = await prisma.smokingMetric.count({
      where: {
        patientId: session.user.id as string
      }
    });

    return NextResponse.json({
      smokingMetrics,
      pagination: {
        page,
        limit,
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit)
      }
    });

  } catch (error) {
    console.error('Smoking metrics API error:', error);
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
    
    const smokingMetric = await prisma.smokingMetric.create({
      data: {
        patientId: session.user.id as string,
        recordedAt: new Date(body.recordedAt),
        cigarettesPerDay: body.cigarettesPerDay,
        carbonMonoxideLevel: body.carbonMonoxideLevel,
        peakFlow: body.peakFlow,
        cravingsIntensity: body.cravingsIntensity,
        quitDate: body.quitDate ? new Date(body.quitDate) : null,
        quitDurationDays: body.quitDurationDays
      }
    });

    return NextResponse.json(smokingMetric);

  } catch (error) {
    console.error('Create smoking metric error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}