import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = session.user.id;
    const { conversationId } = params;

    // Verify that the conversation belongs to the patient
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        patientId: patientId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Mark all unread messages from providers as read
    await prisma.message.updateMany({
      where: {
        conversationId: conversationId,
        senderId: { not: patientId },
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}