import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Test API called');

    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session || !session.user) {
      console.log('No session or user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User ID:', session.user.id);
    console.log('Is Provider:', session.user.isProvider);

    // Test database connection
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);

    // Test doctor-patient connections
    const connectionCount = await prisma.doctorPatientConnection.count();
    console.log('Connection count:', connectionCount);

    return NextResponse.json({
      message: 'Test successful',
      session: {
        userId: session.user.id,
        isProvider: session.user.isProvider,
        email: session.user.email
      },
      database: {
        userCount,
        connectionCount
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}