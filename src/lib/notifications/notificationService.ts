import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/emailService';
import { ClinicalRecommendation } from '@/lib/clinical/decisionSupport';
import { adminMessaging } from '@/lib/firebase/admin';

/**
 * Push notification input payload for FCM.
 */
export interface PushNotificationInput {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}
export interface Notification {
  id: string;
  userId: string;
  type: string; // Changed from literal types to string to match Prisma model
  title: string;
  message: string;
  priority: string; // Changed from literal types to string to match Prisma model
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  emailAlerts: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  highPriority: boolean;
  mediumPriority: boolean;
  lowPriority: boolean;
}

export class NotificationService {
  static async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium',
    actionUrl?: string
  ): Promise<Notification> {
    console.log(`[DEBUG] Creating notification for user ${userId}: ${title} - ${message}`);
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        priority,
        read: false,
        actionUrl
      }
    });

    console.log(`[DEBUG] Notification created: ${notification.id}`);

    // Get user preferences
    const userPreferences = await this.getUserNotificationPreferences(userId);
    
    // Send email if enabled and high priority
    const priorityKey = `${priority}Priority` as keyof NotificationPreferences;
    if (userPreferences.emailAlerts && (priority === 'high' || userPreferences[priorityKey])) {
      await this.sendEmailNotification(userId, title, message, actionUrl);
    }

    // Push notifications if enabled
    if (userPreferences.pushNotifications) {
      await this.sendPushNotification(userId, {
        title,
        body: message,
        data: actionUrl ? { url: actionUrl } : undefined,
      });
    }

    return {
      ...notification,
      actionUrl: notification.actionUrl || undefined
    };
  }

  static async createClinicalNotification(
    userId: string,
    recommendation: ClinicalRecommendation
  ): Promise<Notification> {
    return this.createNotification(
      userId,
      recommendation.type as Notification['type'],
      recommendation.title,
      recommendation.message,
      recommendation.priority,
      recommendation.link
    );
  }

  static async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const where = unreadOnly ? { userId, read: false } : { userId };
    
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return notifications.map(notification => ({
      ...notification,
      actionUrl: notification.actionUrl || undefined
    }));
  }

  static async markAsRead(
    notificationId: string,
    userId: string,
    read: boolean = true
  ): Promise<void> {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read }
    });
    if (result.count === 0) {
      // Prevent cross-user tampering; allow API to translate to 404
      throw new Error('Notification not found for user');
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  }

  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Map persisted NotificationPreference to legacy NotificationPreferences interface used by this service
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      // Default preferences if not yet created
      return {
        emailAlerts: true,
        pushNotifications: true,
        inAppNotifications: true,
        highPriority: true,
        mediumPriority: true,
        lowPriority: false,
      };
    }

    // Legacy interface mapping
    return {
      emailAlerts: pref.emailEnabled,
      pushNotifications: pref.pushEnabled,
      inAppNotifications: true, // keep in-app on for now
      highPriority: true,       // treat high priority as always enabled
      mediumPriority: pref.messages || pref.appointments || pref.prescriptions || pref.investigations,
      lowPriority: pref.marketing,
    };
  }

  private static async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (user && user.email) {
        const subject = `Quitline Alert: ${title}`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${title}</h2>
            <p style="font-size: 16px; line-height: 1.5;">${message}</p>
            ${actionUrl ? `
              <div style="margin-top: 20px;">
                <a href="${actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Take Action
                </a>
              </div>
            ` : ''}
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated notification from Quitline Telehealth Services.
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        `;

        await sendEmail(user.email, subject, html);
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private static async sendPushNotification(
    userId: string,
    notification: PushNotificationInput
  ): Promise<void> {
    try {
      // Fetch active push subscriptions for user
      const subs = await prisma.pushSubscription.findMany({
        where: { userId, enabled: true },
        select: { id: true, token: true },
      });

      if (!subs.length) {
        return;
      }

      // Build base payload which we will attach token to per subscription
      const base = {
        notification: {
          title: notification.title,
          body: notification.body,
          image: notification.imageUrl,
        },
        data: notification.data ?? {},
      } as const;

      // Exponential backoff helper
      const sendWithRetry = async (token: string) => {
        let delay = 500; // ms
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            await adminMessaging.send({ ...base, token });
            return { success: true };
          } catch (err: any) {
            const code: string | undefined = err?.errorInfo?.code ?? err?.code;
            // Handle invalid/expired tokens: clean up and abort retries
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              await prisma.pushSubscription.deleteMany({ where: { token } });
              return { success: false, invalid: true, error: String(code) };
            }
            // If last attempt, bubble error
            if (attempt === maxAttempts) {
              return { success: false, error: String(code ?? err?.message ?? 'unknown') };
            }
            // Backoff and retry
            await new Promise((r) => setTimeout(r, delay));
            delay *= 2;
          }
        }
        return { success: false, error: 'unknown' };
      };

      for (const sub of subs) {
        const result = await sendWithRetry(sub.token);

        // Update lastUsedAt regardless of success to reflect attempted activity
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });

        // Audit delivery attempt (source=system)
        try {
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'send',
              entityType: 'user',
              entityId: userId,
              source: 'system',
              timestamp: new Date(),
              metadata: {
                channel: 'push',
                tokenId: sub.id,
                success: result.success,
                invalid: !!(result as any).invalid,
                error: (result as any).error ?? null,
                title: notification.title,
              } as any,
            },
          });
        } catch (e) {
          // Non-blocking
          console.error('[Push][Audit] Failed to write audit log', e);
        }
      }
    } catch (error) {
      console.error('[Push] Failed to send notification', {
        userId,
        notification,
        error,
      });
    }
  }

  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true
      }
    });
  }

  // Generate sample notifications for testing
  static async generateSampleNotifications(userId: string): Promise<void> {
    const sampleNotifications = [
      {
        type: 'success' as const,
        title: 'Welcome to Quitline!',
        message: 'Your account has been successfully set up. You can now start managing your patients.',
        priority: 'low' as const
      },
      {
        type: 'alert' as const,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM. Service may be temporarily unavailable.',
        priority: 'medium' as const
      },
      {
        type: 'warning' as const,
        title: 'Profile Update Required',
        message: 'Please update your profile information to ensure accurate patient records.',
        priority: 'medium' as const,
        actionUrl: '/provider/profile'
      },
      {
        type: 'success' as const,
        title: 'New Feature Available',
        message: 'Calendar view is now available in your appointments section for better scheduling.',
        priority: 'low' as const,
        actionUrl: '/provider/appointments'
      },
      {
        type: 'alert' as const,
        title: 'Security Reminder',
        message: 'Remember to log out when not using the system and keep your password secure.',
        priority: 'high' as const
      }
    ];

    for (const notification of sampleNotifications) {
      await this.createNotification(
        userId,
        notification.type,
        notification.title,
        notification.message,
        notification.priority,
        notification.actionUrl
      );

      // Add some delay to create notifications at different times
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  /**
   * Register or reactivate a push subscription token for a user.
   */
  static async registerPushToken(
    userId: string,
    token: string,
    deviceType: string,
    deviceInfo?: { deviceName?: string; browser?: string }
  ) {
    const now = new Date();
    const existing = await prisma.pushSubscription.findUnique({
      where: { token },
      select: { id: true },
    });

    if (existing) {
      return prisma.pushSubscription.update({
        where: { token },
        data: {
          userId,
          enabled: true,
          lastUsedAt: now,
          deviceType,
          deviceName: deviceInfo?.deviceName,
          browser: deviceInfo?.browser,
        },
      });
    }

    return prisma.pushSubscription.create({
      data: {
        userId,
        token,
        deviceType,
        deviceName: deviceInfo?.deviceName,
        browser: deviceInfo?.browser,
        enabled: true,
        lastUsedAt: now,
      },
    });
  }

  /**
   * Unregister a push subscription token. Optionally constrain by userId.
   */
  static async unregisterPushToken(token: string, userId?: string): Promise<number> {
    const res = await prisma.pushSubscription.deleteMany({
      where: { token, ...(userId ? { userId } : {}) },
    });
    return res.count;
  }

  /**
   * Send push notification to multiple users (dedupes tokens).
   * Returns a summary for observability and alerting.
   */
  static async sendPushToMultiple(
    userIds: string[],
    notification: PushNotificationInput
  ): Promise<{ targeted: number; sent: number; invalid: number; failed: number }> {
    if (!userIds.length) return { targeted: 0, sent: 0, invalid: 0, failed: 0 };

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds }, enabled: true },
      select: { id: true, token: true, userId: true },
    });
    const uniqueTokens = Array.from(new Set(subs.map((s) => s.token)));
    const base = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl,
      },
      data: notification.data ?? {},
    } as const;

    let sent = 0;
    let invalid = 0;
    let failed = 0;

    const sendWithRetry = async (token: string) => {
      let delay = 500;
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await adminMessaging.send({ ...base, token });
          sent++;
          return;
        } catch (err: any) {
          const code: string | undefined = err?.errorInfo?.code ?? err?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            await prisma.pushSubscription.deleteMany({ where: { token } });
            invalid++;
            return;
          }
          if (attempt === maxAttempts) {
            failed++;
            return;
          }
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
        }
      }
    };

    // Fire sequentially to keep rate low; can be optimized with concurrency control if needed
    for (const token of uniqueTokens) {
      await sendWithRetry(token);
    }

    return { targeted: uniqueTokens.length, sent, invalid, failed };
  }

  /**
   * Send a topic broadcast (e.g., "all_providers"). Caller is responsible for topic membership.
   */
  static async sendTopicNotification(topic: string, notification: PushNotificationInput): Promise<boolean> {
    const base = {
      notification: {
        title: notification.title,
        body: notification.body,
        image: notification.imageUrl,
      },
      data: notification.data ?? {},
      topic,
    } as const;

    let delay = 500;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await adminMessaging.send(base);
        return true;
      } catch (_err) {
        if (attempt === maxAttempts) return false;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
    return false;
  }

  /**
   * Return raw NotificationPreference row with sensible defaults when absent.
   */
  static async getUserPreferences(userId: string) {
    const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (pref) return pref;
    return {
      id: 'default',
      userId,
      appointments: true,
      messages: true,
      prescriptions: true,
      investigations: true,
      marketing: false,
      emailEnabled: true,
      pushEnabled: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  /**
   * Update or create NotificationPreference for a user.
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<{
      appointments: boolean;
      messages: boolean;
      prescriptions: boolean;
      investigations: boolean;
      marketing: boolean;
      emailEnabled: boolean;
      pushEnabled: boolean;
    }>
  ) {
    const defaults = {
      appointments: true,
      messages: true,
      prescriptions: true,
      investigations: true,
      marketing: false,
      emailEnabled: true,
      pushEnabled: true,
    };
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...defaults, ...preferences },
      update: { ...preferences },
    });
  }
}