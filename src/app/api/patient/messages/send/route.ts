import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import { NotificationService } from '@/lib/notifications/notificationService';
import { validateBody } from '@/lib/api/validate';
import { sendPatientMessageSchema, CONTENT_MAX_LENGTH } from '@/lib/validators/message';
import { stripHtml } from '@/lib/security/sanitize';
import { jsonEntity, errorResponse } from '@/lib/api/response';

/**
 * Secure patient message send endpoint
 * - Validates body with Zod (conversationId, content)
 * - Sanitizes HTML content (basic formatting only, no scripts/styles)
 * - Enforces max content length and non-empty check post-sanitize
 * - Verifies conversation exists and sender is participant
 * - Notifies recipient if offline
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    // Validate and sanitize body
    const parsed = await validateBody(request, sendPatientMessageSchema);
    if ('error' in parsed) return parsed.error;
    const { conversationId, content } = parsed.data;
    const senderId = session.user.id;

    // Ensure not empty after sanitize/strip (defense in depth)
    const plain = stripHtml(content).trim();
    if (!plain) {
      return errorResponse('Content must not be empty', 400);
    }
    if (plain.length > CONTENT_MAX_LENGTH) {
      return errorResponse(`Content exceeds maximum length of ${CONTENT_MAX_LENGTH}`, 400);
    }

    // Verify the conversation exists and the user is a participant
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ patientId: senderId }, { providerId: senderId }],
      },
    });

    if (!conversation) {
      return errorResponse('Conversation not found or access denied', 404);
    }

    // Create the message (content already sanitized)
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content, // sanitized HTML
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

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Push notify recipient if offline (non-blocking)
    try {
      const recipientId = senderId === conversation.patientId ? conversation.providerId : conversation.patientId;

      if (recipientId) {
        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
          select: { isOnline: true, firstName: true, lastName: true, isProvider: true },
        });

        if (!recipient?.isOnline) {
          const senderName = `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim();
          const title = `New Message from ${senderName || 'Quitline User'}`;
          const previewPlain = stripHtml(message.content ?? '');
          const preview = previewPlain.length > 140 ? `${previewPlain.slice(0, 140)}…` : previewPlain;
          const actionUrl = recipient?.isProvider ? '/provider/inbox' : '/patient/messages';

          await NotificationService.createNotification(recipientId, 'message', title, preview, 'medium', actionUrl);
        }
      }
    } catch (notifyErr) {
      console.error('[Messages] Failed to push notify recipient', notifyErr);
    }

    // Return uniform entity envelope (privacy headers + requestId)
    return jsonEntity(request, {
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: `${message.sender.firstName ?? ''} ${message.sender.lastName ?? ''}`.trim(),
        senderType: message.senderId === conversation.patientId ? 'patient' : 'doctor',
        timestamp: message.createdAt.toISOString(),
        read: message.read,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return errorResponse('Internal server error', 500);
  }
}