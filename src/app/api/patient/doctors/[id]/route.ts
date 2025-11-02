import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const doctorId = resolvedParams.id;

    // Use a dynamic where clause and cast to any
    const whereClause: any = {
      id: doctorId,
      isProvider: true
    };

    const doctor: any = await prisma.user.findFirst({
      where: whereClause,
      // Cast select to any while TS types catch up after schema changes
      select: ({
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        specialty: true,
        yearsOfExperience: true,
        licenseNumber: true,
        availability: true,
        image: true,
        phone: true,
        address: true,
        createdAt: true,
        // Get connection status
        doctorConnections: {
          where: {
            patientId: session.user.id,
            status: {
              in: ['approved', 'pending']
            }
          },
          select: {
            status: true,
            treatmentType: true
          }
        },
        // Get reviews/ratings from appointments
        appointmentsAsProvider: {
          where: {
            status: 'completed'
          },
          select: {
            id: true
          },
          take: 100 // Limit for performance
        }
      } as any)
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Format doctor data for frontend
    const firstName = doctor.firstName || '';
    const lastName = doctor.lastName || '';
    const displayName = firstName ? `Dr. ${firstName}` : (doctor.email || 'Doctor');

    // Calculate rating (mock for now - in real app, you'd have a reviews system)
    const totalAppointments = (doctor as any).appointmentsAsProvider.length;
    const rating = totalAppointments > 0 ? 4.2 + Math.random() * 0.8 : 4.5; // Mock rating
    const reviewsCount = Math.floor(totalAppointments * 0.7); // Mock review count

    // Check connection status
    const connection = (doctor as any).doctorConnections[0];
    const isConnected = connection?.status === 'approved';
    const connectionStatus = connection?.status as 'pending' | 'approved' | undefined;

    // Parse availability
    let availabilityArray: string[] = [];
    if (doctor.availability && typeof doctor.availability === 'object') {
      const availObj = doctor.availability as Record<string, any>;
      availabilityArray = Object.values(availObj).filter((val): val is string =>
        typeof val === 'string' && val.length > 0
      );
    }
    if (availabilityArray.length === 0) {
      availabilityArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    const formattedDoctor = {
      id: doctor.id,
      name: displayName,
      firstName,
      lastName,
      email: doctor.email,
      bio: doctor.bio || 'Experienced healthcare professional dedicated to providing quality care.',
      specialty: doctor.specialty || 'General Medicine',
      yearsOfExperience: doctor.yearsOfExperience || 5,
      licenseNumber: doctor.licenseNumber,
      rating: Math.round(rating * 10) / 10,
      reviewsCount,
      availability: availabilityArray,
      location: doctor.address ? doctor.address.split(',')[0] : 'Kuala Lumpur',
      languages: ['English', 'Bahasa Malaysia'], // Could be stored in user preferences
      treatmentTypes: [
        'General Consultation',
        'Smoking Cessation',
        'Chronic Disease Management',
        'Preventive Care'
      ], // Could be stored in doctor profile
      qualifications: doctor.licenseNumber ? [`License: ${doctor.licenseNumber}`] : ['MBBS', 'MRCP'],
      profileImage: doctor.image,
      phone: doctor.phone,
      address: doctor.address,
      isConnected,
      connectionStatus,
      memberSince: doctor.createdAt
    };

    return NextResponse.json({ doctor: formattedDoctor });

  } catch (error) {
    console.error('Patient doctor profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}