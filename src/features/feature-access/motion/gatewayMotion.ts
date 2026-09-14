import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { MotionProfile } from '../types';

export const GatewayDelays = {
  background: 0,
  hero: 150,
  status: 300,
  title: 450,
  description: 600,
  benefits: 750,
  actions: 900,
} as const;

export const GatewayDurations = {
  entranceFade: 400,
  heroFloat: 8500,
  heroBreathe: 10500,
  heroSpin: 22000,
  bgAmbient: 18000,
  pressFeedback: 140,
} as const;

export const GatewayEasings = {
  gentle: Easing.inOut(Easing.sin),
  smooth: Easing.out(Easing.cubic),
  spring: { damping: 16, stiffness: 220, mass: 0.7 },
} as const;

/**
 * Hook to detect whether motion should be reduced according to system accessibility
 * or explicit profile override.
 */
export function useGatewayMotion(preferredProfile: MotionProfile = 'HIGH') {
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      listener?.remove?.();
    };
  }, []);

  const effectiveProfile: MotionProfile = reduceMotion
    ? 'LOW'
    : preferredProfile;

  return {
    profile: effectiveProfile,
    isStatic: effectiveProfile === 'LOW',
    isReduced: effectiveProfile === 'MEDIUM' || effectiveProfile === 'LOW',
  };
}
