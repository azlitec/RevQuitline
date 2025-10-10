import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/emailService';
import { ClinicalRecommendation } from '@/lib/clinical/decisionSupport';

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

    // TODO: Implement push notifications if enabled
    if (userPreferences.pushNotifications) {
      await this.sendPushNotification(userId, title, message);
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

  static async markAsRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  }

  static async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    console.log(`[DEBUG] Getting notification preferences for user ${userId} - USING HARDCODED DEFAULTS`);
    // For now, return default preferences
    // In a real implementation, this would fetch from user settings
    return {
      emailAlerts: true,
      pushNotifications: true,
      inAppNotifications: true,
      highPriority: true,
      mediumPriority: true,
      lowPriority: false
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
    title: string,
    message: string
  ): Promise<void> {
    console.log(`[DEBUG] PUSH NOTIFICATION NOT IMPLEMENTED - Would send to user ${userId}: ${title}`);
    // TODO: Implement push notification service integration
    // This would integrate with Firebase Cloud Messaging, OneSignal, or similar
    console.log('Push notification:', { userId, title, message });
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
}