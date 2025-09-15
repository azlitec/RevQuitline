import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = session.user.id;

    // Get all conversations for the patient with their messages
    const conversations = await prisma.conversation.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Only get the last message for the list view
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format the response to match the frontend expectations
    const formattedConversations = conversations.map((conversation: any) => {
      const lastMessage = conversation.messages[0];
      const unreadCount = conversation.messages.filter((msg: any) => !msg.read && msg.senderId !== patientId).length;

      return {
        id: conversation.id,
        doctor: {
          id: conversation.provider.id,
          firstName: conversation.provider.firstName,
          lastName: conversation.provider.lastName,
          specialty: conversation.provider.specialty,
          isOnline: false, // Default to offline since field is not available
          lastSeen: null,
        },
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          senderName: lastMessage.sender.firstName + ' ' + lastMessage.sender.lastName,
          senderType: lastMessage.senderId === patientId ? 'patient' : 'doctor',
          timestamp: lastMessage.createdAt.toISOString(),
          read: lastMessage.read,
        } : undefined,
        unreadCount,
        messages: [], // Will be loaded separately when conversation is selected
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}