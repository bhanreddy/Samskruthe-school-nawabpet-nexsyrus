import { PRIORITY_RANK, type EligiblePopup, type PopupPriority } from './types';

export function sortPopupQueue(popups: EligiblePopup[]): EligiblePopup[] {
  return [...popups].sort((a, b) => {
    const rankA = PRIORITY_RANK[a.priority as PopupPriority] ?? 9;
    const rankB = PRIORITY_RANK[b.priority as PopupPriority] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    const startA = new Date(a.start_at).getTime();
    const startB = new Date(b.start_at).getTime();
    if (startA !== startB) return startA - startB;
    return a.id.localeCompare(b.id);
  });
}

export function nextPopup(queue: EligiblePopup[], currentId?: string | null): EligiblePopup | null {
  const remaining = currentId ? queue.filter((item) => item.id !== currentId) : queue;
  return sortPopupQueue(remaining)[0] || null;
}

export function isPopupStillValid(popup: EligiblePopup, now = new Date()): boolean {
  if (popup.end_at && new Date(popup.end_at) <= now) return false;
  if (popup.start_at && new Date(popup.start_at) > now) return false;
  return true;
}

export function createSessionId(): string {
  return `ps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
