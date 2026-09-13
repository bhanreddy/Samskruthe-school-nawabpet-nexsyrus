import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './apiClient';

const QUEUE_KEY = 'SCHOOLIMS_OFFLINE_GATE_QUEUE';
const CACHE_PASSES_KEY = 'SCHOOLIMS_OFFLINE_APPROVED_PASSES';

export interface OfflineGateEvent {
  clientEventId: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT' | 'WALK_IN';
  payload: any;
  timestamp: string;
}

export const visitorOfflineQueue = {
  listeners: [] as Array<() => void>,

  addListener(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  },

  notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {}
    });
  },

  async getQueueLength(): Promise<number> {
    const events = await this.getQueuedEvents();
    return events.length;
  },

  async syncOfflineEvents(): Promise<void> {
    await this.syncQueue();
    this.notifyListeners();
  },

  /**
   * Enqueues a gate action for later synchronization
   */
  async enqueueEvent(eventType: 'CHECK_IN' | 'CHECK_OUT' | 'WALK_IN', payload: any): Promise<OfflineGateEvent> {
    const event: OfflineGateEvent = {
      clientEventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    try {
      const existing = await this.getQueuedEvents();
      existing.push(event);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
      this.notifyListeners();
    } catch (e) {
      console.error('[OfflineQueue] Failed to enqueue event:', e);
    }

    return event;
  },

  /**
   * Retrieves all queued offline events
   */
  async getQueuedEvents(): Promise<OfflineGateEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Clears the event queue
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  /**
   * Caches today's approved visitor passes for offline validation
   */
  async cacheApprovedPasses(passes: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_PASSES_KEY, JSON.stringify(passes));
    } catch (e) {
      console.error('[OfflineQueue] Failed to cache passes:', e);
    }
  },

  /**
   * Returns cached passes
   */
  async getCachedPasses(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PASSES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Attempts to sync all queued events when network is online
   */
  async syncQueue(): Promise<{ synced: number; remaining: number }> {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      return { synced: 0, remaining: (await this.getQueuedEvents()).length };
    }

    const queue = await this.getQueuedEvents();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    let syncedCount = 0;
    const remaining: OfflineGateEvent[] = [];

    for (const evt of queue) {
      try {
        await api.post('/visitor-management/offline/sync', {
          clientEventId: evt.clientEventId,
          eventType: evt.eventType,
          payload: evt.payload,
        });
        syncedCount++;
      } catch (err: any) {
        // If conflict or already processed, drop from queue
        if (err?.code === 'ALREADY_INSIDE' || err?.status === 409) {
          syncedCount++;
        } else {
          remaining.push(evt);
        }
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return { synced: syncedCount, remaining: remaining.length };
  },
};
