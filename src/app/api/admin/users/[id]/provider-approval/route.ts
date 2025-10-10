import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

interface Params {
  params: { id: string };
}

// PATCH - Approve or reject provider application
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = params;

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.isAdmin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isAdmin: true,
        isClerk: true,
        isProvider: true,
        licenseNumber: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const action = (body?.action as string) || '';
    const reason = (body?.reason as string) || '';

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    if (action === 'approve') {
      // Basic eligibility check: license number must be present
      if (!targetUser.licenseNumber || targetUser.licenseNumber.trim() === '') {
        return NextResponse.json(
          { message: 'Cannot approve: missing medical registration number (licenseNumber)' },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          isProvider: true,
          role: 'PROVIDER',
        },
      });

      const { password: _pw, ...safeUser } = updated as any;

      return NextResponse.json({
        message: 'Provider approved successfully',
        user: safeUser,
      });
    }

    // Reject path
    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        isProvider: false,
        role: targetUser.isAdmin ? 'ADMIN' : targetUser.isClerk ? 'CLERK' : 'USER',
      },
    });

    const { password: _pw2, ...safeUser2 } = updated as any;

    return NextResponse.json({
      message: 'Provider application rejected' + (reason ? `: ${reason}` : ''),
      user: safeUser2,
    });
  } catch (error) {
    console.error('Error updating provider approval:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating provider approval' },
      { status: 500 }
    );
  }
}