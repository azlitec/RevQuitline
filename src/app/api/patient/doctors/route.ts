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
    const specialty = searchParams.get('specialty');
    const search = searchParams.get('search');

    let whereClause: any = {
      isProvider: true
    };

    // Filter by specialty if provided
    if (specialty && specialty !== 'all') {
      whereClause.specialty = specialty;
    }

    // Search by name or email if provided
    if (search) {
      whereClause.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const doctors = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        specialty: true,
        bio: true,
        image: true,
        // isActive field not available in schema
        createdAt: true
      },
      orderBy: {
        firstName: 'asc'
      },
      take: 50 // Limit results for performance
    });

    // Format doctors for frontend
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      firstName: doctor.firstName || '',
      lastName: doctor.lastName || '',
      specialty: doctor.specialty || 'General Medicine',
      email: doctor.email,
      bio: doctor.bio,
      profileImage: doctor.image
    }));

    return NextResponse.json({
      doctors: formattedDoctors,
      total: formattedDoctors.length
    });

  } catch (error) {
    console.error('Patient doctors API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}