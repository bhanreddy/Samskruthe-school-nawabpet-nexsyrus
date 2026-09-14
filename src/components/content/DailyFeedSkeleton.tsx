import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/useTheme';
import { clayTokens } from '@/src/styles/clayTokens';

function useShimmer() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [p]);
  return p;
}

function SkeletonBlock({
  shimmer,
  width,
  height,
  radius = 12,
  style,
}: {
  shimmer: SharedValue<number>;
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: object;
}) {
  const a = useAnimatedStyle(() => ({ opacity: 0.45 + 0.35 * Math.sin(shimmer.value * Math.PI) }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: 'rgba(76,90,120,0.14)' }, a, style]}
    />
  );
}

export default function DailyFeedSkeleton() {
  const { isDark } = useTheme();
  const shimmer = useShimmer();
  const cardBg = isDark ? clayTokens.colors.card.dark : clayTokens.colors.card.light;
  const borderCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(76,90,120,0.08)';

  return (
    <View style={styles.container} accessibilityLabel="Loading today's edition">
      <View style={[styles.thoughtSkeleton, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <SkeletonBlock shimmer={shimmer} width={90} height={20} radius={10} style={{ marginBottom: 16 }} />
        <SkeletonBlock shimmer={shimmer} width="90%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonBlock shimmer={shimmer} width="75%" height={18} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBlock shimmer={shimmer} width={120} height={12} />
          <SkeletonBlock shimmer={shimmer} width={40} height={24} radius={12} />
        </View>
      </View>

      <View style={[styles.newsHeroSkeleton, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <SkeletonBlock shimmer={shimmer} width="100%" height={170} radius={0} />
        <View style={{ padding: 16 }}>
          <SkeletonBlock shimmer={shimmer} width="85%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonBlock shimmer={shimmer} width="60%" height={14} style={{ marginBottom: 12 }} />
          <SkeletonBlock shimmer={shimmer} width={130} height={12} />
        </View>
      </View>

      {[1, 2].map((i) => (
        <View key={i} style={[styles.newsStandardSkeleton, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <SkeletonBlock shimmer={shimmer} width={70} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBlock shimmer={shimmer} width="90%" height={14} style={{ marginBottom: 6 }} />
            <SkeletonBlock shimmer={shimmer} width="70%" height={14} style={{ marginBottom: 10 }} />
            <SkeletonBlock shimmer={shimmer} width={100} height={10} />
          </View>
          <SkeletonBlock shimmer={shimmer} width={80} height={80} radius={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  thoughtSkeleton: {
    borderRadius: clayTokens.radii.card,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  newsHeroSkeleton: {
    borderRadius: clayTokens.radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  newsStandardSkeleton: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
});

export { DailyFeedSkeleton };
