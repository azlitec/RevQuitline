import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationCounts {
  unreadMessages: number;
  upcomingAppointments: number;
}

export function useNotificationCounts() {
  const { data: session } = useSession();
  const [counts, setCounts] = useState<NotificationCounts>({
    unreadMessages: 0,
    upcomingAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user && !session.user.isProvider) {
      fetchNotificationCounts();
      
      // Refresh counts every 30 seconds
      const interval = setInterval(fetchNotificationCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchNotificationCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch unread messages count
      const messagesResponse = await fetch('/api/patient/messages');
      let unreadMessages = 0;
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        unreadMessages = messagesData.conversations?.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0) || 0;
      }

      // Fetch upcoming appointments count
      const appointmentsResponse = await fetch('/api/appointments?page=0&limit=50');
      let upcomingAppointments = 0;
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        const appointments = appointmentsData.data?.items || [];
        const now = new Date();
        upcomingAppointments = appointments.filter((apt: any) => {
          const appointmentDate = new Date(apt.date);
          return appointmentDate >= now && !['cancelled', 'completed', 'no-show'].includes(apt.status?.toLowerCase());
        }).length;
      }

      setCounts({
        unreadMessages,
        upcomingAppointments,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      // Keep existing counts on error
    } finally {
      setLoading(false);
    }
  };

  return { counts, loading, refresh: fetchNotificationCounts };
}