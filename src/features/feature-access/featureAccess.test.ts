import { FeatureAccessState, FEATURE_KEYS } from './types';
import { getFeatureConfig } from './config/featureRegistry';
import { resolveFeatureKeyFromRoute, ROUTE_FEATURE_MAP } from './config/routeFeatureMap';
import { EntitlementStore } from './store/entitlementStore';

describe('Feature Access Platform Unit Tests', () => {
  beforeEach(async () => {
    await EntitlementStore.invalidate();
  });

  describe('Feature Registry & 3-Year Future Stability', () => {
    it('returns known configurations for registered features', () => {
      const analytics = getFeatureConfig(FEATURE_KEYS.ANALYTICS);
      expect(analytics.name).toBe('Executive Analytics');
      expect(analytics.hero).toBe('LENS');
      expect(analytics.minPlanTier).toBe('premium');
      expect(analytics.defaultBenefits.length).toBeGreaterThan(0);
    });

    it('gracefully handles arbitrary future features in 2029 without crashing', () => {
      const futureFeature = getFeatureConfig('ai_predictive_classroom_allocation');
      expect(futureFeature.key).toBe('ai_predictive_classroom_allocation');
      expect(futureFeature.name).toBe('Ai Predictive Classroom Allocation');
      expect(futureFeature.hero).toBe('ORBIT');
      expect(futureFeature.defaultBenefits.length).toBeGreaterThan(0);
    });
  });

  describe('Route-to-Feature Mapping', () => {
    it('resolves exact route patterns', () => {
      expect(resolveFeatureKeyFromRoute('/admin/analytics')).toBe(FEATURE_KEYS.ANALYTICS);
      expect(resolveFeatureKeyFromRoute('/admin/omr')).toBe(FEATURE_KEYS.OMR_SCANNER);
      expect(resolveFeatureKeyFromRoute('/accounts/omr-print')).toBe(FEATURE_KEYS.OMR_SCANNER);
      expect(resolveFeatureKeyFromRoute('/admin/visitors')).toBe(FEATURE_KEYS.VISITOR_MANAGEMENT);
      expect(resolveFeatureKeyFromRoute('/admin/academic-planner')).toBe(FEATURE_KEYS.ACADEMIC_PLANNING);
    });

    it('resolves sub-routes via prefix matching', () => {
      expect(resolveFeatureKeyFromRoute('/admin/analytics/attendance-drop')).toBe(FEATURE_KEYS.ANALYTICS);
      expect(resolveFeatureKeyFromRoute('/admin/omr/answer-key')).toBe(FEATURE_KEYS.OMR_SCANNER);
      expect(resolveFeatureKeyFromRoute('/admin/omr/print')).toBe(FEATURE_KEYS.OMR_SCANNER);
    });

    it('returns null for unregistered or invalid routes', () => {
      expect(resolveFeatureKeyFromRoute('/random/invalid/page')).toBeNull();
      expect(resolveFeatureKeyFromRoute('')).toBeNull();
    });
  });

  describe('Entitlement Store & Caching', () => {
    it('returns null for uncached features', () => {
      const cached = EntitlementStore.getCachedEntitlement(FEATURE_KEYS.ANALYTICS);
      expect(cached).toBeNull();
    });

    it('caches and retrieves an entitlement record synchronously', async () => {
      const mockResponse = {
        allowed: true,
        state: FeatureAccessState.ALLOWED,
        feature: {
          key: FEATURE_KEYS.ATTENDANCE,
          name: 'Daily Attendance',
          description: 'Attendance tracking',
          category: 'operations',
          hero: 'PULSE' as const,
        },
        ui: {
          eyebrow: 'CAPABILITY',
          title: 'Daily Attendance',
          description: 'Roll call',
          benefits: ['Twice-daily tracking'],
        },
        actions: [],
      };

      await EntitlementStore.setCachedEntitlement(FEATURE_KEYS.ATTENDANCE, mockResponse, 5000);

      const cached = EntitlementStore.getCachedEntitlement(FEATURE_KEYS.ATTENDANCE);
      expect(cached).not.toBeNull();
      expect(cached?.allowed).toBe(true);
      expect(cached?.state).toBe(FeatureAccessState.ALLOWED);
    });

    it('ignores expired cache records', async () => {
      const mockResponse = {
        allowed: false,
        state: FeatureAccessState.PLAN_REQUIRED,
        feature: {
          key: FEATURE_KEYS.ANALYTICS,
          name: 'Analytics',
          description: 'Insights',
          category: 'intelligence',
          hero: 'LENS' as const,
        },
        ui: {
          eyebrow: 'PREMIUM',
          title: 'Analytics',
          description: 'Insights',
          benefits: [],
        },
        actions: [],
      };

      // Set negative TTL so it is already expired
      await EntitlementStore.setCachedEntitlement(FEATURE_KEYS.ANALYTICS, mockResponse, -1000);

      const cached = EntitlementStore.getCachedEntitlement(FEATURE_KEYS.ANALYTICS);
      expect(cached).toBeNull();
    });

    it('generates safe offline fallback responses on network failure', () => {
      const fallback = EntitlementStore.createFallbackResponse(
        FEATURE_KEYS.OMR_SCANNER,
        FeatureAccessState.ACCESS_CHECK_FAILED,
        'Offline verification error'
      );

      expect(fallback.allowed).toBe(false);
      expect(fallback.state).toBe(FeatureAccessState.ACCESS_CHECK_FAILED);
      expect(fallback.ui.title).toBe('Verification Offline');
      expect(fallback.actions.some((a) => a.type === 'RETRY')).toBe(true);
      expect(fallback.actions.some((a) => a.type === 'GO_HOME')).toBe(true);
    });

    it('generates safe invalid route response for +not-found.tsx', () => {
      const fallback = EntitlementStore.createFallbackResponse(
        'unknown_screen',
        FeatureAccessState.INVALID_ROUTE
      );

      expect(fallback.allowed).toBe(false);
      expect(fallback.state).toBe(FeatureAccessState.INVALID_ROUTE);
      expect(fallback.ui.eyebrow).toBe('PAGE NOT FOUND');
      expect(fallback.actions.some((a) => a.type === 'GO_HOME')).toBe(true);
    });
  });
});
