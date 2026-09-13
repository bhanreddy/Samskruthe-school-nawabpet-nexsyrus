import { createQrScanGate } from './qrScanGate';

describe('QR scan duplicate lock', () => {
  it('accepts only the first of five rapid scans', () => {
    const gate = createQrScanGate(1500);
    const results = Array.from({ length: 5 }, () => gate.tryAcquire());
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(gate.isLocked()).toBe(true);
  });

  it('allows a retry only after an explicit release', () => {
    const gate = createQrScanGate(0);
    expect(gate.tryAcquire()).toBe(true);
    expect(gate.tryAcquire()).toBe(false);
    gate.release();
    expect(gate.tryAcquire()).toBe(true);
  });
});
