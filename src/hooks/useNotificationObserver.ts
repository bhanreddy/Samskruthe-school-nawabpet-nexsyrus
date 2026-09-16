import { useCallback, useEffect, useRef } from 'react';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getInitialNotification, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './useAuth';
import { notificationInboxService } from '../services/notificationInboxService';
import {
  pushNotificationRoute,
  resolveNotificationRoute,
} from '../utils/notificationRoutes';

export { resolveNotificationRoute } from '../utils/notificationRoutes';

interface PendingNotification {
  data: Record<string, any>;
}

// Stored when notification tapped before auth is ready.
let pendingNotification: PendingNotification | null = null;

function payloadFromUnknown(input: unknown): Record<string, any> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, any>;
  }
  return {};
}

function resolveRecipientUserId(data: Record<string, any> | null | undefined): string | null {
  if (!data) return null;
  // `recipientUserId` is emitted by the current backend. Only use explicit
  // recipient fields: a generic `user_id` in an older notification can refer
  // to a sender or another entity, not the account that received the alert.
  const value = data.recipientUserId || data.recipient_user_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function roleCodeFromUser(user: { role?: unknown } | null | undefined): string | null {
  const role = user?.role;
  if (typeof role === 'string') return role;
  if (role && typeof role === 'object' && 'code' in role) {
    const code = (role as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export function useNotificationObserver() {
  const router = useRouter();
  const { user, loading, switchAccount } = useAuth();
  const authRef = useRef({ user, loading, switchAccount });
  const switchingRef = useRef(false);

  // The native listeners are registered once, so read the current auth state
  // from a ref instead of closing over the user present at mount time.
  authRef.current = { user, loading, switchAccount };

  const navigate = useCallback(async (raw: Record<string, any> | null | undefined) => {
    const data = payloadFromUnknown(raw);
    const recipientUserId = resolveRecipientUserId(data);
    const notificationId = String(data.notificationId || '') || null;
    try {
      const activeAuth = authRef.current;
      const activeUserId = activeAuth.user?.userId ?? null;
      if (!activeUserId || activeAuth.loading) {
        pendingNotification = { data };
        return;
      }

      if (recipientUserId && recipientUserId !== activeUserId) {
        if (switchingRef.current) {
          // Keep the most recent tap and process it once the in-flight switch
          // settles. A notification must never open under the wrong account.
          pendingNotification = { data };
          return;
        }

        switchingRef.current = true;
        try {
          const result = await activeAuth.switchAccount(recipientUserId);
          if (result.error || result.session?.validatedUser?.userId !== recipientUserId) {
            // The notification's account is no longer stored locally or can no
            // longer be restored. Preserve the active account and do not route.
            console.warn('[Notifications] Could not switch to notification recipient:', result.error || 'recipient session unavailable');
            return;
          }
        } finally {
          switchingRef.current = false;
        }
      }

      const resolved = resolveNotificationRoute(data, roleCodeFromUser(authRef.current.user));
      console.log('[Notifications] Navigating to:', resolved?.pathname);
      // Mark after any account switch, so a notification sent to a vaulted
      // account is never marked under the currently active account by mistake.
      if (notificationId) void notificationInboxService.markRead(notificationId);
      pushNotificationRoute(router, resolved);
    } catch (err) {
      console.log('[Notifications] Navigation error:', err);
    }
  }, [router]);

  // Flush a tap received before auth is ready.
  useEffect(() => {
    if (user && !loading && pendingNotification) {
      const notification = pendingNotification;
      pendingNotification = null;
      setTimeout(() => {
        void navigate(notification.data);
      }, 300);
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;
    const app = getApp();
    const msg = getMessaging(app);

    // CASE 1 — App KILLED, user tapped FCM notification
    getInitialNotification(msg).then((remoteMessage) => {
      if (!remoteMessage || !isMounted) return;
      setTimeout(() => void navigate(payloadFromUnknown(remoteMessage.data)), 500);
    });

    // CASE 2 — App BACKGROUNDED, user tapped FCM notification
    const unsubFCM = onNotificationOpenedApp(msg, (remoteMessage) => {
      void navigate(payloadFromUnknown(remoteMessage.data));
    });

    // CASE 3 — User tapped expo-notifications notification (all states)
    const unsubExpo = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void navigate(payloadFromUnknown(response.notification.request.content.data));
      }
    );

    // CASE 4 — App KILLED, user tapped expo-notifications notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || !isMounted) return;
      void navigate(payloadFromUnknown(response.notification.request.content.data));
    });

    return () => {
      isMounted = false;
      unsubFCM();
      unsubExpo.remove();
    };
  }, [navigate]);
}
