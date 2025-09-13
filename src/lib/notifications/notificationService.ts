import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email/emailService';
import { ClinicalRecommendation } from '@/lib/clinical/decisionSupport';

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
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

    // Get user preferences
    const userPreferences = await this.getUserNotificationPreferences(userId);
    
    // Send email if enabled and high priority
    if (userPreferences.emailAlerts && (priority === 'high' || userPreferences[`${priority}Priority`])) {
      await this.sendEmailNotification(userId, title, message, actionUrl);
    }

    // TODO: Implement push notifications if enabled
    if (userPreferences.pushNotifications) {
      await this.sendPushNotification(userId, title, message);
    }

    return notification;
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

    return notifications;
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
}