import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { eventService } from './eventService';

const EVENT_QUEUE_STORAGE_KEY = '@schoolims_event_offline_queue_v1';

export type QueuedActionType =
  | 'GATE_CHECKIN'
  | 'ATTENDANCE_MARK'
  | 'TRANSPORT_BOARDING'
  | 'COMPETITION_SCORE'
  | 'INCIDENT_REPORT';

export interface QueuedEventAction {
  id: string;
  type: QueuedActionType;
  eventId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

class EventOfflineQueue {
  private queue: QueuedEventAction[] = [];
  private isProcessing = false;
  private isListeningNetInfo = false;

  constructor() {
    this.init();
  }

  private async init() {
    await this.loadQueue();
    if (!this.isListeningNetInfo) {
      this.isListeningNetInfo = true;
      NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          this.drainQueue();
        }
      });
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(EVENT_QUEUE_STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[EventOfflineQueue] Failed to load stored queue', err);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(EVENT_QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.warn('[EventOfflineQueue] Failed to persist queue', err);
    }
  }

  /**
   * Enqueue an action to be dispatched now or when back online
   */
  async enqueue(type: QueuedActionType, eventId: string, payload: any): Promise<QueuedEventAction> {
    const item: QueuedEventAction = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      eventId,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(item);
    await this.persistQueue();

    // Check if currently online to attempt immediate drain
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable !== false) {
      this.drainQueue();
    }

    return item;
  }

  /**
   * Drain the queue sequentially
   */
  async drainQueue(): Promise<{ processed: number; remaining: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { processed: 0, remaining: this.queue.length };
    }

    this.isProcessing = true;
    let processed = 0;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];

        try {
          await this.executeAction(item);
          // Success: remove from queue
          this.queue.shift();
          processed++;
          await this.persistQueue();
        } catch (err: any) {
          console.warn(`[EventOfflineQueue] Failed processing action ${item.type}:`, err?.message || err);
          item.retryCount += 1;

          // If terminal 4xx client error (other than 408/429), discard to prevent queue poison
          const status = err?.statusCode || err?.status;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            this.queue.shift();
            await this.persistQueue();
          } else if (item.retryCount >= 5) {
            // Drop after 5 retries
            this.queue.shift();
            await this.persistQueue();
          } else {
            // Transient failure or offline again; stop processing
            await this.persistQueue();
            break;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed, remaining: this.queue.length };
  }

  private async executeAction(item: QueuedEventAction): Promise<any> {
    switch (item.type) {
      case 'GATE_CHECKIN':
        return await eventService.checkInPass({
          token: item.payload.token,
          eventId: item.eventId,
          gateId: item.payload.gateId,
          scanType: item.payload.scanType || 'GATE_ENTRY',
          verificationMethod: item.payload.verificationMethod || 'QR_SCAN',
        });

      case 'ATTENDANCE_MARK':
        return await eventService.markAttendanceManual(item.eventId, {
          studentId: item.payload.studentId,
          status: item.payload.status,
          notes: item.payload.notes,
        });

      case 'TRANSPORT_BOARDING':
        return await eventService.updateBoardingStatus(
          item.eventId,
          item.payload.manifestId,
          item.payload.boardingStatus
        );

      case 'COMPETITION_SCORE':
        return await eventService.recordCompetitionScore(
          item.eventId,
          item.payload.competitionId,
          item.payload.scoreData
        );

      case 'INCIDENT_REPORT':
        return await eventService.reportIncident(item.eventId, item.payload);

      default:
        console.warn(`[EventOfflineQueue] Unknown action type: ${(item as any).type}`);
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  getPendingItems(): QueuedEventAction[] {
    return [...this.queue];
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
  }
}

export const eventOfflineQueue = new EventOfflineQueue();
