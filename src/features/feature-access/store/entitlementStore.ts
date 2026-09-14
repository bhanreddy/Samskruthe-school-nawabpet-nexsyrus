import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeatureAccessState, FeatureAccessResponse } from '../types';
import { FeatureAccessApi } from '../services/featureAccessApi';
import { getFeatureConfig } from '../config/featureRegistry';

const CACHE_KEY = '@schoolims_entitlements_v3';
const CACHE_VERSION = '3.0.0';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface CachedEntitlementRecord {
  allowed: boolean;
  state: FeatureAccessState;
  requiredPlan?: string;
  response?: FeatureAccessResponse;
  generatedAt: number;
  expiresAt: number;
  version: string;
}

interface EntitlementStoreState {
  entitlements: Record<string, CachedEntitlementRecord>;
  loading: boolean;
  hydrated: boolean;
  lastSyncAt: number;
}

let state: EntitlementStoreState = {
  entitlements: {},
  loading: false,
  hydrated: false,
  lastSyncAt: 0,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const setState = (patch: Partial<EntitlementStoreState>) => {
  state = { ...state, ...patch };
  emit();
};

export const EntitlementStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot: (): EntitlementStoreState => state,

  /**
   * Synchronous check against local memory cache.
   * Returns null if un-cached or expired.
   */
  getCachedEntitlement: (featureKey: string): CachedEntitlementRecord | null => {
    const item = state.entitlements[featureKey];
    if (!item) return null;
    const isExpired = Date.now() > item.expiresAt;
    if (isExpired) return null;
    return item;
  },

  /**
   * Cache a single feature resolution.
   */
  setCachedEntitlement: async (
    featureKey: string,
    resolution: FeatureAccessResponse,
    ttlMs: number = DEFAULT_TTL_MS
  ) => {
    const now = Date.now();
    const record: CachedEntitlementRecord = {
      allowed: resolution.allowed,
      state: resolution.state,
      requiredPlan: resolution.subscription?.requiredPlan,
      response: resolution,
      generatedAt: now,
      expiresAt: now + ttlMs,
      version: CACHE_VERSION,
    };

    const nextEntitlements = {
      ...state.entitlements,
      [featureKey]: record,
    };

    setState({ entitlements: nextEntitlements });
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(nextEntitlements));
    } catch {
      // Non-critical cache write failure
    }
  },

  /**
   * Hydrate memory from AsyncStorage on app startup.
   */
  hydrate: async (): Promise<void> => {
    if (state.hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const first = Object.values(parsed)[0] as CachedEntitlementRecord | undefined;
          if (first?.version === CACHE_VERSION) {
            setState({
              entitlements: parsed,
              hydrated: true,
              lastSyncAt: Date.now(),
            });
            return;
          }
        }
      }
    } catch {
      // Memory defaults stand
    }
    setState({ hydrated: true });
  },

  /**
   * Bulk sync all entitlements from server (e.g. after login or plan change).
   */
  syncAll: async (force: boolean = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - state.lastSyncAt < 60 * 1000) return; // 1-minute throttle

    setState({ loading: true });
    try {
      const payload = await FeatureAccessApi.fetchAllEntitlements();
      const updated: Record<string, CachedEntitlementRecord> = { ...state.entitlements };

      if (payload?.features) {
        for (const [key, item] of Object.entries(payload.features)) {
          updated[key] = {
            allowed: item.allowed,
            state: item.state as FeatureAccessState,
            requiredPlan: item.requiredPlan,
            generatedAt: now,
            expiresAt: now + DEFAULT_TTL_MS,
            version: CACHE_VERSION,
          };
        }
      }

      setState({
        entitlements: updated,
        loading: false,
        hydrated: true,
        lastSyncAt: now,
      });

      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated)).catch(() => {});
    } catch {
      setState({ loading: false });
    }
  },

  /**
   * Invalidate and clear all cached entitlements (e.g. on logout or tenant switch).
   */
  invalidate: async (): Promise<void> => {
    setState({
      entitlements: {},
      loading: false,
      hydrated: true,
      lastSyncAt: 0,
    });
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  },

  /**
   * Synthesize a safe fallback response for offline failure or malformed data.
   */
  createFallbackResponse: (
    featureKey: string,
    stateType: FeatureAccessState = FeatureAccessState.ACCESS_CHECK_FAILED,
    customReason?: string
  ): FeatureAccessResponse => {
    const config = getFeatureConfig(featureKey);
    let eyebrow = 'UNABLE TO VERIFY ACCESS';
    let title = 'Verification Offline';
    let desc = 'Unable to verify feature entitlement. Please check network connection and retry.';

    if (stateType === FeatureAccessState.INVALID_ROUTE) {
      eyebrow = 'PAGE NOT FOUND';
      title = 'Screen Not Found';
      desc = 'The requested screen or feature is not available.';
    }

    return {
      allowed: false,
      state: stateType,
      feature: {
        key: featureKey,
        name: config.name,
        description: config.description,
        category: config.category,
        hero: config.hero,
      },
      subscription: { currentPlan: 'standard', requiredPlan: config.minPlanTier },
      ui: {
        eyebrow,
        title,
        description: customReason || desc,
        benefits: config.defaultBenefits,
      },
      actions:
        stateType === FeatureAccessState.INVALID_ROUTE
          ? [
              { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'primary' },
              { type: 'GO_BACK', label: 'Go Back', variant: 'secondary' },
            ]
          : [
              { type: 'RETRY', label: 'Retry Verification', variant: 'primary' },
              { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'secondary' },
            ],
    };
  },
};

// Auto-hydrate once at module load
EntitlementStore.hydrate();
