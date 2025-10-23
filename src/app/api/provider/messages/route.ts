import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';

type ProviderMessage = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'doctor';
  timestamp: string;
  read: boolean;
};

type ProviderConversation = {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone?: string | null;
    isOnline: boolean;
    lastSeen?: string | null;
  };
  lastMessage?: ProviderMessage;
  unreadCount: number;
  messages: ProviderMessage[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.isProvider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providerId = session.user.id;

    // Fetch conversations for this provider with patient, and recent messages
    // Load up to 100 messages per conversation ordered ASC for chat rendering
    const conversations = await prisma.conversation.findMany({
      where: { providerId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
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
      orderBy: { updatedAt: 'desc' },
    });

    const data: ProviderConversation[] = conversations.map((c) => {
      const msgs: ProviderMessage[] = c.messages.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: `${m.sender?.firstName ?? ''} ${m.sender?.lastName ?? ''}`.trim(),
        senderType: m.senderId === providerId ? 'doctor' : 'patient',
        timestamp: m.createdAt.toISOString(),
        read: m.read,
      }));

      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;

      // Unread count for provider = messages from patient that are unread
      const unreadCount = c.messages.reduce((acc, m) => {
        const fromPatient = m.senderId !== providerId;
        return acc + (fromPatient && !m.read ? 1 : 0);
      }, 0);

      return {
        id: c.id,
        patient: {
          id: c.patient.id,
          firstName: c.patient.firstName ?? '',
          lastName: c.patient.lastName ?? '',
          email: c.patient.email ?? null,
          phone: c.patient.phone ?? null,
          isOnline: c.patient.isOnline ?? false,
          lastSeen: c.patient.lastSeen ? c.patient.lastSeen.toISOString() : null,
        },
        lastMessage,
        unreadCount,
        messages: msgs,
      };
    });

    return NextResponse.json({ conversations: data });
  } catch (error) {
    console.error('Error fetching provider conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}