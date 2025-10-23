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
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Test database connection without exposing PII
    const userCount = await prisma.user.count();
    const connectionCount = await prisma.doctorPatientConnection.count();

    return NextResponse.json({
      message: 'Test successful',
      database: {
        userCount,
        connectionCount
      }
    });
  } catch (error) {
    console.error('Test API error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}