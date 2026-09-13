import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { acquireOverlay, overlayHolder, releaseOverlay, subscribeOverlay } from '../overlayLock';
import { popupApi } from '../popupApi';
import { cacheEligiblePopups, drainOfflineActions, enqueueOfflineAction, readEligibleCache } from '../popupCache';
import { executePopupAction } from '../popupActionRegistry';
import { createSessionId, isPopupStillValid, nextPopup, sortPopupQueue } from '../popupQueue';
import { setPopupUnreadCount } from '../popupUnreadStore';
import type { EligiblePopup, PopupButton } from '../types';
import { PopupRenderer } from './PopupRenderer';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PopupQueueProvider() {
  const { user, role, authChecked, loading, schoolId } = useAuth();
  const router = useRouter();
  const userId = user?.userId ?? null;
  const [current, setCurrent] = useState<EligiblePopup | null>(null);
  const [busy, setBusy] = useState(false);
  const queueRef = useRef<EligiblePopup[]>([]);
  const sessionRef = useRef(createSessionId());
  const shownRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);
  const userIdRef = useRef(userId);
  const schoolIdRef = useRef(schoolId);
  userIdRef.current = userId;
  schoolIdRef.current = schoolId;

  const clearAll = useCallback(() => {
    queueRef.current = [];
    shownRef.current = new Set();
    setCurrent(null);
    releaseOverlay('popup');
    setPopupUnreadCount(0);
  }, []);

  const presentNext = useCallback(() => {
    if (overlayHolder() && overlayHolder() !== 'popup') {
      setCurrent(null);
      return;
    }
    const upcoming = nextPopup(
      queueRef.current.filter((item) => isPopupStillValid(item) && !shownRef.current.has(item.id)),
    );
    if (!upcoming) {
      releaseOverlay('popup');
      setCurrent(null);
      return;
    }
    if (!acquireOverlay('popup')) {
      setCurrent(null);
      return;
    }
    setCurrent(upcoming);
  }, []);

  const syncAction = useCallback(async (popupId: string, action: 'view' | 'click' | 'dismiss' | 'acknowledge', payload?: Record<string, string | null>) => {
    const uid = userIdRef.current;
    const sid = String(schoolIdRef.current || '');
    if (!uid) return;
    try {
      if (action === 'view') await popupApi.view(popupId, sessionRef.current);
      if (action === 'click') await popupApi.click(popupId, payload?.actionType || 'NONE', payload?.target);
      if (action === 'dismiss') await popupApi.dismiss(popupId);
      if (action === 'acknowledge') await popupApi.acknowledge(popupId);
    } catch {
      await enqueueOfflineAction(uid, {
        popupId,
        action,
        payload,
        queuedAt: new Date().toISOString(),
        schoolId: sid,
        userId: uid,
      });
    }
  }, []);

  const flushOffline = useCallback(async () => {
    const uid = userIdRef.current;
    const sid = String(schoolIdRef.current || '');
    if (!uid) return;
    const queued = await drainOfflineActions(uid);
    for (const item of queued) {
      if (item.userId !== uid || item.schoolId !== sid) continue;
      await syncAction(item.popupId, item.action, item.payload);
    }
  }, [syncAction]);

  const loadEligible = useCallback(async () => {
    if (!authChecked || loading || !userIdRef.current || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      await delay(1400);
      if (!userIdRef.current) return;
      await flushOffline();
      let items: EligiblePopup[] = [];
      try {
        items = await popupApi.eligible(sessionRef.current);
        await cacheEligiblePopups(userIdRef.current, items);
        const count = await popupApi.unreadCount().catch(() => 0);
        setPopupUnreadCount(count);
      } catch {
        items = await readEligibleCache(userIdRef.current);
      }
      queueRef.current = sortPopupQueue(items).slice(0, 15);
      presentNext();
    } catch {
      // Popup fetch must never block login or dashboard.
    } finally {
      fetchingRef.current = false;
    }
  }, [authChecked, loading, flushOffline, presentNext]);

  useEffect(() => {
    sessionRef.current = createSessionId();
    shownRef.current = new Set();
    queueRef.current = [];
    setCurrent(null);
    releaseOverlay('popup');
    if (authChecked && userId) void loadEligible();
    else clearAll();
  }, [userId, schoolId, authChecked, loadEligible, clearAll]);

  useEffect(() => {
    const onApp = (state: AppStateStatus) => {
      if (state === 'active' && userIdRef.current) void loadEligible();
    };
    const sub = AppState.addEventListener('change', onApp);
    const unsub = subscribeOverlay(() => {
      if (!overlayHolder()) presentNext();
    });
    return () => {
      sub.remove();
      unsub();
    };
  }, [loadEligible, presentNext]);

  useEffect(() => {
    if (!current) return;
    shownRef.current.add(current.id);
    void syncAction(current.id, 'view');
  }, [current?.id, syncAction]);

  const finishCurrent = useCallback((popupId: string) => {
    queueRef.current = queueRef.current.filter((item) => item.id !== popupId);
    setCurrent(null);
    releaseOverlay('popup');
    setTimeout(presentNext, 220);
  }, [presentNext]);

  const handleDismiss = useCallback(() => {
    if (!current?.allow_dismiss) return;
    const id = current.id;
    void syncAction(id, 'dismiss');
    finishCurrent(id);
  }, [current, finishCurrent, syncAction]);

  const handleButton = useCallback(async (button: PopupButton) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      await syncAction(current.id, 'click', { actionType: button.actionType, target: button.target || null });
      const result = await executePopupAction(button, role);
      if (result.kind === 'acknowledge' || current.require_acknowledgement && result.kind !== 'dismiss') {
        await syncAction(current.id, 'acknowledge');
      }
      if (result.kind === 'dismiss') await syncAction(current.id, 'dismiss');
      const id = current.id;
      finishCurrent(id);
      if (result.kind === 'route') router.push(result.href);
    } finally {
      setBusy(false);
    }
  }, [busy, current, finishCurrent, role, router, syncAction]);

  if (!current) return null;
  return (
    <PopupRenderer
      popup={current}
      busy={busy}
      onButton={handleButton}
      onDismiss={handleDismiss}
    />
  );
}
