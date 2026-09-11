export function retryDelayMs(attempts: number) {
  return Math.min(8000 * 2 ** Math.max(0, attempts), 5 * 60 * 1000);
}

export function shouldAttempt(
  item: { status: string; nextRetryAt: number },
  now = Date.now(),
) {
  if (item.status === 'synced' || item.status === 'uploading' || item.status === 'processing') return false;
  if (item.status === 'saved') return true;
  return item.status === 'failed' && now >= item.nextRetryAt;
}
