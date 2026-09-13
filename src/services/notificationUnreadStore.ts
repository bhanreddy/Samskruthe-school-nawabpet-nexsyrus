import { useSyncExternalStore } from 'react';

let override: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeNotificationUnreadOverride(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotificationUnreadOverride(): number | null {
  return override;
}

export function setNotificationUnreadOverride(next: number | null) {
  if (override === next) return;
  override = next;
  emit();
}

export function useNotificationUnreadOverride() {
  return useSyncExternalStore(
    subscribeNotificationUnreadOverride,
    getNotificationUnreadOverride,
    getNotificationUnreadOverride,
  );
}
