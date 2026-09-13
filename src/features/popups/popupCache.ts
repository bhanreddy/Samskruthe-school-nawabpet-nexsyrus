import { StorageService } from '../../services/storageService';
import type { EligiblePopup } from './types';

const CACHE_TYPE = 'popup_eligible';
const QUEUE_TYPE = 'popup_offline_actions';

export type OfflinePopupAction = {
  popupId: string;
  action: 'view' | 'click' | 'dismiss' | 'acknowledge';
  payload?: Record<string, string | null>;
  queuedAt: string;
  schoolId: string;
  userId: string;
};

export async function cacheEligiblePopups(userId: string, items: EligiblePopup[]): Promise<void> {
  if (!userId) return;
  await StorageService.set(userId, CACHE_TYPE, items);
}

export async function readEligibleCache(userId: string): Promise<EligiblePopup[]> {
  if (!userId) return [];
  const record = await StorageService.get<EligiblePopup>(userId, CACHE_TYPE);
  return Array.isArray(record?.data) ? record.data : [];
}

export async function enqueueOfflineAction(userId: string, action: OfflinePopupAction): Promise<void> {
  const record = await StorageService.get<OfflinePopupAction>(userId, QUEUE_TYPE);
  const current = Array.isArray(record?.data) ? record.data : [];
  const next = [...current, action].slice(-40);
  await StorageService.set(userId, QUEUE_TYPE, next);
}

export async function drainOfflineActions(userId: string): Promise<OfflinePopupAction[]> {
  const record = await StorageService.get<OfflinePopupAction>(userId, QUEUE_TYPE);
  const current = Array.isArray(record?.data) ? record.data : [];
  await StorageService.set(userId, QUEUE_TYPE, []);
  return current;
}
