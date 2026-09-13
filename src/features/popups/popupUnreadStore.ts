import { useSyncExternalStore } from 'react';

let unread = 0;
const listeners = new Set<() => void>();

export function setPopupUnreadCount(count: number) {
  const next = Math.max(0, Number(count) || 0);
  if (next === unread) return;
  unread = next;
  listeners.forEach((fn) => fn());
}

export function getPopupUnreadCount() {
  return unread;
}

export function usePopupUnreadCount() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getPopupUnreadCount,
    getPopupUnreadCount,
  );
}
