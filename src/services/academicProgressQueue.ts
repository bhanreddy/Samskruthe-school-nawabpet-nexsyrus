import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AcademicPlannerService } from './academicPlannerService';
import { getOrCreateDeviceId } from './deviceId';

const QUEUE_KEY = 'SCHOOLIMS_ACADEMIC_PROGRESS_QUEUE';

export interface AcademicProgressQueueItem {
  action: 'MARK_COMPLETED' | 'PARTIALLY_COMPLETED' | 'CONTINUE_NEXT_PERIOD' | 'SKIPPED';
  planId: string;
  planItemId: string;
  clientTimestamp: string;
  deviceId: string;
  notes?: string;
  syncStatus: 'PENDING' | 'SYNCING';
}

export const academicProgressQueue = {
  async enqueue(item: Omit<AcademicProgressQueueItem, 'clientTimestamp' | 'deviceId' | 'syncStatus'>) {
    const queued: AcademicProgressQueueItem = {
      ...item,
      clientTimestamp: new Date().toISOString(),
      deviceId: await getOrCreateDeviceId(),
      syncStatus: 'PENDING',
    };
    const existing = await this.list();
    existing.push(queued);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
    return queued;
  },

  async list(): Promise<AcademicProgressQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async flush() {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    const items = await this.list();
    if (!items.length) return;
    const remaining: AcademicProgressQueueItem[] = [];
    for (const item of items) {
      try {
        await AcademicPlannerService.recordProgress(item.planId, {
          plan_item_id: item.planItemId,
          status: item.action === 'MARK_COMPLETED' ? 'COMPLETED' : item.action,
          notes: item.notes,
          source: 'OFFLINE_SYNC',
          date: item.clientTimestamp.slice(0, 10),
        });
      } catch {
        remaining.push(item);
      }
    }
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  },
};
