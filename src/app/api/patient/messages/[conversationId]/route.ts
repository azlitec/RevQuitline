import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(
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

    // Get all messages for the conversation
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Order from oldest to newest for chat view
      },
    });

    // Format the messages
    const formattedMessages = messages.map((message: any) => ({
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      senderName: message.sender.firstName + ' ' + message.sender.lastName,
      senderType: message.senderId === patientId ? 'patient' : 'doctor',
      timestamp: message.createdAt.toISOString(),
      read: message.read,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}