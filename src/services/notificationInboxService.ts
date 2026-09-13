import { api } from './apiClient';
import { invalidateApiQueryCache } from '../hooks/useApiQuery';
import { setNotificationUnreadOverride } from './notificationUnreadStore';

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  actionUrl: string | null;
  type: string | null;
  createdAt: string;
  readAt: string | null;
}

interface InboxResponse {
  notifications: InboxNotification[];
}

export const notificationInboxService = {
  async list(limit = 100): Promise<InboxNotification[]> {
    const response = await api.get<InboxResponse>('/notifications/inbox', { limit }, { silent: true });
    return Array.isArray(response?.notifications) ? response.notifications : [];
  },

  async markRead(notificationId: string): Promise<void> {
    if (!notificationId) return;
    await api.post(`/notifications/${encodeURIComponent(notificationId)}/read`, undefined, { silent: true });
  },

  async markAllRead(): Promise<void> {
    setNotificationUnreadOverride(0);
    try {
      try {
        await api.post('/notifications/inbox/read-all', undefined, { silent: true });
      } catch {
        const items = await notificationInboxService.list();
        await Promise.all(
          items.filter((item) => !item.readAt).map((item) => notificationInboxService.markRead(item.id)),
        );
      }
    } finally {
      invalidateApiQueryCache('dashboard');
    }
  },
};
