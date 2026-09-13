export interface QrScanGate {
  tryAcquire: () => boolean;
  release: () => void;
  reset: () => void;
  isLocked: () => boolean;
}

export function createQrScanGate(cooldownMs = 1500): QrScanGate {
  let locked = false;
  let lastAt = 0;

  return {
    tryAcquire() {
      const now = Date.now();
      if (locked || now - lastAt < cooldownMs) return false;
      locked = true;
      lastAt = now;
      return true;
    },
    release() {
      locked = false;
    },
    reset() {
      locked = false;
      lastAt = 0;
    },
    isLocked() {
      return locked;
    },
  };
}
