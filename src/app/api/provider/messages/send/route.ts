import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';
// SECURITY: centralized validation/sanitization and error responses
import { validateBody } from '@/lib/api/validate';
import { errorResponse } from '@/lib/api/response';
import { stripHtml } from '@/lib/security/sanitize';
import { sendPatientMessageSchema, CONTENT_MAX_LENGTH } from '@/lib/validators/message';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.isProvider) {
      return errorResponse('Unauthorized', 401);
    }

    // SECURITY: validate and sanitize body
    const parsed = await validateBody(request, sendPatientMessageSchema);
    if ('error' in parsed) return parsed.error;
    const { conversationId, content } = parsed.data;

    const plain = stripHtml(content || '').trim();
    if (!plain) {
      return errorResponse('Content must not be empty', 400);
    }
    if (plain.length > CONTENT_MAX_LENGTH) {
      return errorResponse(`Content exceeds maximum length of ${CONTENT_MAX_LENGTH}`, 400);
    }

    const providerId = session.user.id;

    // Verify the conversation exists and belongs to this provider
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, providerId },
      select: { id: true, patientId: true, providerId: true },
    });

    if (!conversation) {
      return errorResponse('Conversation not found or access denied', 404);
    }

    // Create the message from provider
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: providerId,
        // SECURITY: persist sanitized content only
        content: plain,
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
    });

    // Update conversation updatedAt for sorting
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Push notify patient recipient if offline
    try {
      const recipientId = conversation.patientId;
      if (recipientId) {
        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
          select: { isOnline: true, firstName: true, lastName: true },
        });

        if (!recipient?.isOnline) {
          const senderName = `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim();
          const title = `New Message from ${senderName || 'Your Provider'}`;
          const preview =
            (message.content ?? '').length > 140
              ? `${(message.content ?? '').slice(0, 140)}…`
              : message.content ?? '';

          await NotificationService.createNotification(
            recipientId,
            'message',
            title,
            preview,
            'medium',
            '/patient/messages'
          );
        }
      }
    } catch (notifyErr) {
      // Non-blocking: log and continue
      console.error('[Provider Messages] Failed to push notify patient', notifyErr);
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim(),
        senderType: 'doctor',
        timestamp: message.createdAt.toISOString(),
        read: message.read,
      },
    });
  } catch (error) {
    // SECURITY: standardized error without leaking details
    return errorResponse('Internal server error', 500);
  }
}