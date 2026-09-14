import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { FeatureAccessState, FeatureAccessResponse } from '../types';
import { EntitlementStore } from '../store/entitlementStore';
import { FeatureAccessApi } from '../services/featureAccessApi';

export interface UseFeatureAccessReturn {
  allowed: boolean;
  state: FeatureAccessState;
  resolution: FeatureAccessResponse | null;
  loading: boolean;
  error: string | null;
  checkAccess: (force?: boolean) => Promise<FeatureAccessResponse>;
  refresh: () => Promise<void>;
}

export function useFeatureAccess(featureKey: string): UseFeatureAccessReturn {
  const storeState = useSyncExternalStore(
    EntitlementStore.subscribe,
    EntitlementStore.getSnapshot
  );

  const cached = storeState.entitlements[featureKey];
  const [resolution, setResolution] = useState<FeatureAccessResponse | null>(
    cached?.response || null
  );
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(
    async (force: boolean = false): Promise<FeatureAccessResponse> => {
      // 1. Check valid cache if not forcing network
      if (!force) {
        const memCached = EntitlementStore.getCachedEntitlement(featureKey);
        if (memCached?.response) {
          setResolution(memCached.response);
          setLoading(false);
          return memCached.response;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response = await FeatureAccessApi.fetchFeatureAccess(featureKey);
        await EntitlementStore.setCachedEntitlement(featureKey, response);
        setResolution(response);
        setLoading(false);
        return response;
      } catch (err: any) {
        console.warn(`[useFeatureAccess] Verification failed for ${featureKey}:`, err?.message || err);

        // Offline / failure behavior:
        // If prior cached decision exists, honor it
        if (cached?.response) {
          setResolution(cached.response);
          setLoading(false);
          return cached.response;
        }

        // Otherwise generate ACCESS_CHECK_FAILED fallback
        const fallback = EntitlementStore.createFallbackResponse(
          featureKey,
          FeatureAccessState.ACCESS_CHECK_FAILED,
          'Unable to verify feature entitlement offline. Please retry when connection returns.'
        );
        setResolution(fallback);
        setError(err?.message || 'Access check failed');
        setLoading(false);
        return fallback;
      }
    },
    [featureKey, cached]
  );

  useEffect(() => {
    let isMounted = true;

    // If we have cached response, keep it
    if (cached?.response && (!resolution || resolution.feature.key !== featureKey)) {
      setResolution(cached.response);
      setLoading(false);
    } else if (!cached) {
      checkAccess(false).then((res) => {
        if (isMounted) {
          setResolution(res);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [featureKey, cached, checkAccess]);

  const refresh = useCallback(async () => {
    await checkAccess(true);
  }, [checkAccess]);

  return {
    allowed: resolution ? resolution.allowed : false,
    state: resolution ? resolution.state : FeatureAccessState.ACCESS_CHECK_FAILED,
    resolution,
    loading,
    error,
    checkAccess,
    refresh,
  };
}
