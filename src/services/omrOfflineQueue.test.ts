import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => {},
  fetch: async () => ({ isConnected: false, isInternetReachable: false }),
}));

jest.mock('./omrService', () => ({
  omrService: {
    batchSyncScans: jest.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

import { omrOfflineQueue } from './omrOfflineQueue';

describe('omrOfflineQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await omrOfflineQueue.clearQueue();
  });

  it('persists a captured sheet with a client scan id', async () => {
    const item = await omrOfflineQueue.enqueueScan({
      omrExamId: 'exam-1',
      sheetId: 'SHT-1',
      imageBase64: 'abc123',
    });
    expect(item.clientScanId).toBeTruthy();
    expect(await omrOfflineQueue.getQueueCount()).toBe(1);
    const queue = await omrOfflineQueue.getQueue();
    expect(queue[0].imageBase64).toBe('abc123');
  });
});
