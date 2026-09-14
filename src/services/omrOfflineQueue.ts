/**
 * SchoolIMS — OMR Offline Queue
 * Persists captured sheets locally and syncs idempotently when connectivity returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { omrService } from './omrService';

const OMR_QUEUE_STORAGE_KEY = '@schoolims_omr_offline_queue_v1';
const MAX_QUEUE_ITEMS = 25;

export interface QueuedOmrScan {
  clientScanId: string;
  omrExamId: string;
  sheetId: string;
  batchId?: string;
  imageBase64: string;
  qrPayload?: string;
  detectedRollNumber?: number | null;
  detectedAnswers?: any[];
  overallConfidence?: number;
  qualityScore?: string;
  timestamp: string;
  retryCount: number;
}

function newClientScanId(): string {
  return `omr_scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

class OmrOfflineQueueManager {
  private listeners: Array<(count: number) => void> = [];
  private isSyncing = false;

  constructor() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.syncQueue().catch((err) => {
          console.warn('[OmrOfflineQueue] Auto-sync on reconnect failed:', err?.message || err);
        });
      }
    });
  }

  public addListener(cb: (count: number) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private async notifyListeners(): Promise<void> {
    const count = await this.getQueueCount();
    this.listeners.forEach((l) => {
      try {
        l(count);
      } catch {}
    });
  }

  public async getQueue(): Promise<QueuedOmrScan[]> {
    try {
      const raw = await AsyncStorage.getItem(OMR_QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public async getQueueCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  public async enqueueScan(scanData: {
    omrExamId: string;
    sheetId: string;
    imageBase64: string;
    batchId?: string;
    qrPayload?: string;
    detectedRollNumber?: number | null;
    detectedAnswers?: any[];
    overallConfidence?: number;
    qualityScore?: string;
    clientScanId?: string;
  }): Promise<QueuedOmrScan> {
    const item: QueuedOmrScan = {
      clientScanId: scanData.clientScanId || newClientScanId(),
      omrExamId: scanData.omrExamId,
      sheetId: scanData.sheetId,
      batchId: scanData.batchId,
      imageBase64: scanData.imageBase64 || '',
      qrPayload: scanData.qrPayload,
      detectedRollNumber: scanData.detectedRollNumber,
      detectedAnswers: scanData.detectedAnswers,
      overallConfidence: scanData.overallConfidence,
      qualityScore: scanData.qualityScore || 'GOOD',
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    const queue = await this.getQueue();
    const next = [...queue.filter((row) => row.clientScanId !== item.clientScanId), item].slice(-MAX_QUEUE_ITEMS);
    await AsyncStorage.setItem(OMR_QUEUE_STORAGE_KEY, JSON.stringify(next));
    await this.notifyListeners();

    const net = await NetInfo.fetch();
    if (net.isConnected) {
      this.syncQueue().catch(() => {});
    }

    return item;
  }

  public async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    const queue = await this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    const remaining: QueuedOmrScan[] = [];

    const examGroups = new Map<string, QueuedOmrScan[]>();
    queue.forEach((item) => {
      if (!examGroups.has(item.omrExamId)) examGroups.set(item.omrExamId, []);
      examGroups.get(item.omrExamId)!.push(item);
    });

    for (const [examId, items] of examGroups.entries()) {
      try {
        const payload = {
          omr_exam_id: examId,
          batch_id: items[0].batchId,
          scans: items.map((i) => ({
            sheet_id: i.sheetId,
            client_scan_id: i.clientScanId,
            detected_roll_number: i.detectedRollNumber,
            detected_answers: i.detectedAnswers,
            overall_confidence: i.overallConfidence,
            quality_score: i.qualityScore,
            imageBase64: i.imageBase64 || undefined,
          })),
        };

        const res = await omrService.batchSyncScans(payload);
        if (res.success) {
          const failedIds = new Set(
            (res.data || []).filter((row: any) => !row.scanId).map((row: any) => row.clientScanId)
          );
          items.forEach((item) => {
            if (failedIds.has(item.clientScanId) && item.retryCount < 8) {
              remaining.push({ ...item, retryCount: item.retryCount + 1 });
            } else if (!failedIds.has(item.clientScanId)) {
              syncedCount += 1;
            } else {
              remaining.push({ ...item, retryCount: item.retryCount + 1 });
            }
          });
        } else {
          remaining.push(...items.map((i) => ({ ...i, retryCount: i.retryCount + 1 })));
        }
      } catch (err) {
        console.warn(`[OmrOfflineQueue] Batch upload failed for exam ${examId}:`, err);
        remaining.push(...items.map((i) => ({ ...i, retryCount: i.retryCount + 1 })));
      }
    }

    try {
      await AsyncStorage.setItem(OMR_QUEUE_STORAGE_KEY, JSON.stringify(remaining));
      await this.notifyListeners();
    } catch {}

    this.isSyncing = false;
    return { synced: syncedCount, failed: remaining.length };
  }

  public async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(OMR_QUEUE_STORAGE_KEY);
    await this.notifyListeners();
  }
}

export const omrOfflineQueue = new OmrOfflineQueueManager();
export { newClientScanId };
