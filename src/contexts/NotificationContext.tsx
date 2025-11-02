'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

interface NotificationContextType {
  counts: {
    unreadMessages: number;
    upcomingAppointments: number;
  };
  loading: boolean;
  refresh: () => void;
  markMessagesAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { counts, loading, refresh } = useNotificationCounts();

  const markMessagesAsRead = useCallback(() => {
    // Optimistically update the count
    // The actual API call to mark as read is handled in the messages page
    refresh();
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{
      counts,
      loading,
      refresh,
      markMessagesAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}