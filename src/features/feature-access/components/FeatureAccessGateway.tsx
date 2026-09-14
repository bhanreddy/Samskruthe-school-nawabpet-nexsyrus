import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import {
  FeatureAccessState,
  FeatureAccessResponse,
  MotionProfile,
  GatewayAction,
} from '../types';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { GatewayBackground } from './GatewayBackground';
import { GatewayHero } from './GatewayHero';
import { GatewayStatus } from './GatewayStatus';
import { GatewayBenefits } from './GatewayBenefits';
import { GatewayActions } from './GatewayActions';
import { GatewayFooter } from './GatewayFooter';
import { useGatewayMotion, GatewayDelays } from '../motion/gatewayMotion';
import { executeGatewayAction } from '../utils/gatewayActionEngine';
import { getFeatureConfig } from '../config/featureRegistry';
import * as Haptics from '../../../utils/haptics';

export interface FeatureAccessGatewayProps {
  /**
   * Pre-resolved feature entitlement from backend.
   * If provided, the gateway renders this exact configuration.
   */
  resolution?: FeatureAccessResponse | null;

  /**
   * Feature key identifier to resolve or use fallback metadata for.
   */
  featureKey?: string;

  /**
   * Explicit override for states (e.g. forced INVALID_ROUTE for +not-found.tsx).
   */
  forcedState?: FeatureAccessState;

  /**
   * Optional custom title override.
   */
  customTitle?: string;

  /**
   * Optional custom description override.
   */
  customDescription?: string;

  /**
   * Explicit motion profile override (HIGH, MEDIUM, LOW).
   */
  motionProfile?: MotionProfile;

  /**
   * Callback invoked on Retry CTA.
   */
  onRetry?: () => Promise<void> | void;
}

export const FeatureAccessGateway: React.FC<FeatureAccessGatewayProps> = ({
  resolution,
  featureKey = 'unknown',
  forcedState,
  customTitle,
  customDescription,
  motionProfile = 'HIGH',
  onRetry,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { isStatic } = useGatewayMotion(motionProfile);

  // User-initiated workflow state flags
  const [isRequested, setIsRequested] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  // Determine effective feature key & configuration
  const effectiveKey = resolution?.feature?.key || featureKey;
  const config = getFeatureConfig(effectiveKey);

  // Determine effective access state
  const effectiveState: FeatureAccessState =
    forcedState || resolution?.state || FeatureAccessState.PLAN_REQUIRED;

  // Title, description & eyebrow synthesis
  const effectiveEyebrow =
    resolution?.ui?.eyebrow ||
    (effectiveState === FeatureAccessState.INVALID_ROUTE
      ? 'PAGE NOT FOUND'
      : effectiveState === FeatureAccessState.COMING_SOON
      ? 'COMING SOON'
      : effectiveState === FeatureAccessState.BETA
      ? 'EARLY ACCESS'
      : effectiveState === FeatureAccessState.FEATURE_DISABLED
      ? 'FEATURE UNAVAILABLE'
      : effectiveState === FeatureAccessState.PERMISSION_DENIED
      ? 'ACCESS RESTRICTED'
      : 'PREMIUM CAPABILITY');

  const effectiveTitle =
    customTitle || resolution?.ui?.title || config.name || 'Feature Access';

  const effectiveDescription =
    customDescription || resolution?.ui?.description || config.description;

  const effectiveBenefits = resolution?.ui?.benefits || config.defaultBenefits || [];

  const effectiveHero = resolution?.feature?.hero || config.hero || 'ORBIT';

  // Effective actions synthesis
  const effectiveActions: GatewayAction[] =
    resolution?.actions && resolution.actions.length > 0
      ? resolution.actions
      : effectiveState === FeatureAccessState.INVALID_ROUTE
      ? [
          { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'primary' },
          { type: 'GO_BACK', label: 'Go Back', variant: 'secondary' },
        ]
      : effectiveState === FeatureAccessState.COMING_SOON
      ? [
          { type: 'NOTIFY_ME', label: 'Notify Me', variant: 'primary' },
          { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'secondary' },
        ]
      : effectiveState === FeatureAccessState.BETA
      ? [
          { type: 'REQUEST_EARLY_ACCESS', label: 'Request Early Access', variant: 'primary' },
          { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'secondary' },
        ]
      : effectiveState === FeatureAccessState.ACCESS_CHECK_FAILED
      ? [
          { type: 'RETRY', label: 'Retry Verification', variant: 'primary' },
          { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'secondary' },
        ]
      : [
          { type: 'UPGRADE_PLAN', label: 'View Upgrade Options', variant: 'primary' },
          { type: 'ASK_ADMIN', label: 'Ask Administrator', variant: 'secondary' },
          { type: 'GO_HOME', label: 'Go to Dashboard', variant: 'ghost' },
        ];

  const handleExecuteAction = async (action: GatewayAction) => {
    await executeGatewayAction({
      action,
      featureKey: effectiveKey,
      resolution: resolution || null,
      router,
      user,
      onStateChange: (patch) => {
        if (patch.requested !== undefined) setIsRequested(patch.requested);
        if (patch.subscribed !== undefined) setIsSubscribed(patch.subscribed);
      },
      onRetry,
    });
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  };

  const backButtonBg = isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.85)';
  const backButtonBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const arrowColor = isDark ? '#F1F5F9' : '#0F172A';

  return (
    <View style={styles.root}>
      {/* 1. Ambient Background Layer */}
      <GatewayBackground isStatic={isStatic} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        {/* Top Header Bar with Back button */}
        <View style={styles.topBar}>
          <Pressable
            onPress={handleBackPress}
            style={[styles.backButton, { backgroundColor: backButtonBg, borderColor: backButtonBorder }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke={arrowColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>

        {/* Scrollable Main Gateway Body */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { width: Math.min(width, 540) }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Staged Entrance Hero */}
          <Animated.View
            entering={isStatic ? undefined : FadeIn.delay(GatewayDelays.hero).duration(450)}
          >
            <GatewayHero archetype={effectiveHero} isStatic={isStatic} size={180} />
          </Animated.View>

          {/* Staged Entrance Status Title & Description */}
          <Animated.View
            entering={isStatic ? undefined : FadeInDown.delay(GatewayDelays.status).duration(450)}
          >
            <GatewayStatus
              eyebrow={effectiveEyebrow}
              title={effectiveTitle}
              description={effectiveDescription}
              state={effectiveState}
              requiredPlanName={resolution?.subscription?.requiredPlanName}
            />
          </Animated.View>

          {/* Staged Entrance Benefits List */}
          {effectiveBenefits.length > 0 && effectiveState !== FeatureAccessState.INVALID_ROUTE ? (
            <Animated.View
              entering={isStatic ? undefined : FadeInDown.delay(GatewayDelays.benefits).duration(450)}
              style={styles.fullWidth}
            >
              <GatewayBenefits benefits={effectiveBenefits} />
            </Animated.View>
          ) : null}

          {/* Staged Entrance Actions */}
          <Animated.View
            entering={isStatic ? undefined : FadeInDown.delay(GatewayDelays.actions).duration(450)}
            style={styles.fullWidth}
          >
            <GatewayActions
              actions={effectiveActions}
              onExecuteAction={handleExecuteAction}
              isRequested={isRequested}
              isSubscribed={isSubscribed}
            />
          </Animated.View>

          {/* Reassurance Footer */}
          <GatewayFooter />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 20,
    justifyContent: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollContent: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 32,
  },
  fullWidth: {
    width: '100%',
  },
});

export default React.memo(FeatureAccessGateway);
