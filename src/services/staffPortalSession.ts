export interface StaffPortalSession {
  staffId?: string;
  viewAsName?: string;
  userId?: string;
  actorUserId?: string;
}

const EMPTY_SESSION: StaffPortalSession = {};
let currentSession: StaffPortalSession = EMPTY_SESSION;
const listeners = new Set<() => void>();

export function getStaffPortalSession(): StaffPortalSession {
  return currentSession;
}

export function subscribeToStaffPortalSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStaffPortalSession(
  staffId: string,
  viewAsName?: string,
  userId?: string,
  actorUserId?: string,
): void {
  const normalizedId = String(staffId || '').trim();
  if (!normalizedId) {
    clearStaffPortalSession();
    return;
  }

  const normalizedName = viewAsName?.trim() || undefined;
  const normalizedUserId = userId?.trim() || currentSession.userId;
  const normalizedActorId = actorUserId?.trim() || currentSession.actorUserId;
  if (
    currentSession.staffId === normalizedId
    && currentSession.viewAsName === normalizedName
    && currentSession.userId === normalizedUserId
    && currentSession.actorUserId === normalizedActorId
  ) return;

  currentSession = {
    staffId: normalizedId,
    viewAsName: normalizedName,
    userId: normalizedUserId,
    actorUserId: normalizedActorId,
  };
  listeners.forEach((listener) => listener());
}

export function clearStaffPortalSession(): void {
  if (!currentSession.staffId && !currentSession.actorUserId) return;
  currentSession = EMPTY_SESSION;
  listeners.forEach((listener) => listener());
}

/** Auth/identity endpoints must always see the real admin, never the viewed staff. */
export function shouldAttachStaffPortalHeader(endpoint: string): boolean {
  if (!currentSession.staffId) return false;
  const path = String(endpoint || '').split('?')[0];
  return !path.startsWith('/auth');
}
