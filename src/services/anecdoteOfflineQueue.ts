import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { SCHOOL_ID } from '../constants/school';
import { AnecdoteService } from './anecdoteService';

export type AnecdoteQueueStatus = 'saved' | 'uploading' | 'synced' | 'failed';

export interface AnecdoteQueueItem {
  id: string; // client_generated_id
  teacherId: string;
  payload: Record<string, any>;
  status: AnecdoteQueueStatus;
  attempts: number;
  nextRetryAt: number;
  lastError?: string;
  createdAt: number;
}

const PREFIX = `anecdote_queue_${SCHOOL_ID}_`;

export function queueKey(teacherId: string): string {
  return `${PREFIX}${teacherId}`;
}

export function newAnecdoteClientId(): string {
  try {
    if (typeof Crypto?.randomUUID === 'function') {
      const generated = Crypto.randomUUID();
      if (generated) return String(generated);
    }
  } catch {
    // fallback
  }
  return `anecdote_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function readQueue(teacherId: string): Promise<AnecdoteQueueItem[]> {
  if (!teacherId) return [];
  try {
    const raw = await AsyncStorage.getItem(queueKey(teacherId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeQueue(teacherId: string, items: AnecdoteQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(queueKey(teacherId), JSON.stringify(items.slice(-50)));
}

/**
 * Enqueue an observation locally for background sync
 */
export async function enqueueAnecdote(
  teacherId: string,
  payload: Record<string, any>
): Promise<AnecdoteQueueItem> {
  const clientId = payload.client_generated_id || newAnecdoteClientId();
  const item: AnecdoteQueueItem = {
    id: clientId,
    teacherId,
    payload: {
      ...payload,
      client_generated_id: clientId,
    },
    status: 'saved',
    attempts: 0,
    nextRetryAt: Date.now(),
    createdAt: Date.now(),
  };

  const existing = await readQueue(teacherId);
  const next = [item, ...existing.filter((row) => row.id !== item.id)];
  await writeQueue(teacherId, next);
  return item;
}

/**
 * Attempt to flush queued anecdotes when network is available
 */
export async function flushAnecdoteQueue(teacherId: string): Promise<{
  flushed: number;
  remaining: number;
}> {
  const net = await NetInfo.fetch();
  const online = Boolean(net.isConnected && net.isInternetReachable !== false);
  if (!online) {
    const queue = await readQueue(teacherId);
    return { flushed: 0, remaining: queue.filter((i) => i.status !== 'synced').length };
  }

  const items = await readQueue(teacherId);
  let flushed = 0;
  const next: AnecdoteQueueItem[] = [];

  for (const item of items) {
    if (item.status === 'synced') continue;

    try {
      item.status = 'uploading';
      item.attempts += 1;
      await AnecdoteService.createAnecdote(item.payload as any);
      item.status = 'synced';
      flushed += 1;
    } catch (err: any) {
      item.status = 'failed';
      item.lastError = err.message || 'Sync failed';
      item.nextRetryAt = Date.now() + Math.min(60000, 2000 * Math.pow(2, item.attempts));
      next.push(item);
    }
  }

  // Retain unsynced items
  await writeQueue(teacherId, next);
  return { flushed, remaining: next.length };
}

export type QueuedAnecdote = AnecdoteQueueItem;

export const AnecdoteOfflineQueue = {
  async getPendingObservations(teacherId = 'current_staff'): Promise<QueuedAnecdote[]> {
    return readQueue(teacherId);
  },
  async enqueueObservation(payload: Record<string, any>, teacherId = 'current_staff'): Promise<QueuedAnecdote> {
    return enqueueAnecdote(teacherId, payload);
  },
  async syncPendingObservations(teacherId = 'current_staff'): Promise<{ synced: number; remaining: number }> {
    const res = await flushAnecdoteQueue(teacherId);
    return { synced: res.flushed, remaining: res.remaining };
  },
};

