import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../hooks/useTheme';
import { GatewayDurations, GatewayEasings } from '../motion/gatewayMotion';

interface GatewayBackgroundProps {
  isStatic?: boolean;
}

export const GatewayBackground: React.FC<GatewayBackgroundProps> = ({ isStatic = false }) => {
  const { theme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const ambientOpacity = useSharedValue(isDark ? 0.35 : 0.45);
  const ambientTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isStatic) return;

    ambientOpacity.value = withRepeat(
      withTiming(isDark ? 0.55 : 0.65, {
        duration: GatewayDurations.bgAmbient,
        easing: GatewayEasings.gentle,
      }),
      -1,
      true
    );

    ambientTranslateY.value = withRepeat(
      withTiming(12, {
        duration: GatewayDurations.bgAmbient * 0.8,
        easing: GatewayEasings.gentle,
      }),
      -1,
      true
    );
  }, [isStatic, isDark, ambientOpacity, ambientTranslateY]);

  const animatedGlowStyle = useAnimatedStyle(() => {
    if (isStatic) return { opacity: isDark ? 0.4 : 0.5 };
    return {
      opacity: ambientOpacity.value,
      transform: [{ translateY: ambientTranslateY.value }],
    };
  });

  const baseBg = theme.colors.background || (isDark ? '#0B0F17' : '#F8FAFC');
  const glowPrimary = isDark ? '#1E293B' : '#E2E8F0';
  const glowAccent = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.10)';
  const gridLineColor = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: baseBg }]}>
      {/* 1. Subtle Structural Grid lines (Technical / Editorial feeling) */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {/* Horizontal latitude lines */}
        <Line x1="0" y1={height * 0.22} x2={width} y2={height * 0.22} stroke={gridLineColor} strokeWidth="1" strokeDasharray="4 4" />
        <Line x1="0" y1={height * 0.48} x2={width} y2={height * 0.48} stroke={gridLineColor} strokeWidth="1" />
        <Line x1="0" y1={height * 0.76} x2={width} y2={height * 0.76} stroke={gridLineColor} strokeWidth="1" strokeDasharray="4 4" />

        {/* Vertical boundary lines */}
        <Line x1={width * 0.12} y1="0" x2={width * 0.12} y2={height} stroke={gridLineColor} strokeWidth="1" strokeDasharray="6 6" />
        <Line x1={width * 0.88} y1="0" x2={width * 0.88} y2={height} stroke={gridLineColor} strokeWidth="1" strokeDasharray="6 6" />
      </Svg>

      {/* 2. Soft Ambient Luminous Emitter */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedGlowStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="ambientGlowTop" cx="50%" cy="20%" r="60%">
              <Stop offset="0%" stopColor={glowAccent} stopOpacity="1" />
              <Stop offset="60%" stopColor={glowPrimary} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={baseBg} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#ambientGlowTop)" />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default React.memo(GatewayBackground);
