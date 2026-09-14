import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { AcademicPlannerService, AcademicToday } from '../services/academicPlannerService';
import { clayCard } from '../theme/clayStyles';
import { clayTokens } from '../styles/clayTokens';
import * as Haptics from '../utils/haptics';

const BRAND = clayTokens.colors.brand;
const IS_WEB = Platform.OS === 'web';

interface Props {
  isDark: boolean;
  onPress: () => void;
}

function formatClock(value?: string | null) {
  if (!value) return '';
  return String(value).slice(0, 5);
}

export default function AcademicTodayCard({ isDark, onPress }: Props) {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<AcademicToday | null>(null);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const data = await AcademicPlannerService.getToday().catch(() => null);
          if (alive) setToday(data);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  const slot: any = today?.current_slot;
  const topic = slot?.current_topic;
  const classLabel = [slot?.class_name, slot?.section_name].filter(Boolean).join(' ');
  const periodLabel = slot?.period_number
    ? `Period ${slot.period_number}${formatClock(slot.start_time) ? ` · ${formatClock(slot.start_time)}` : ''}`
    : today?.has_classes_today
      ? 'Mapped from your timetable'
      : 'Waiting on timetable';
  const lessonCount = Array.isArray(today?.scheduled_slots) ? today!.scheduled_slots!.length : 0;
  const topicTitle = topic?.topic_title as string | undefined;
  const chapterTitle = topic?.chapter_title as string | undefined;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const ink = isDark ? '#F0F2FF' : '#2A3142';
  const muted = isDark ? 'rgba(240,242,255,0.58)' : '#6B7590';
  const iconWell = isDark ? 'rgba(108,99,255,0.20)' : BRAND.violetSoft;

  return (
    <Animated.View
      entering={FadeInDown.delay(120).duration(320)}
      style={[animStyle, styles.wrap]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 90 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        style={[
          clayCard(isDark, 'sm'),
          styles.cardShell,
          IS_WEB ? { cursor: 'pointer' as const } : null,
        ]}
      >
        <View style={styles.cardInner}>
        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconWell, { backgroundColor: iconWell }]}>
              <Ionicons name="book" size={16} color={BRAND.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: ink }]}>Academic today</Text>
              <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>
                {periodLabel}
              </Text>
            </View>
          </View>
          {lessonCount > 0 ? (
            <View style={[styles.chip, { backgroundColor: isDark ? 'rgba(0,196,160,0.16)' : BRAND.emeraldSoft }]}>
              <Text style={[styles.chipText, { color: isDark ? '#5EEAD4' : '#0F766E' }]}>
                {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>

        {loading && !today ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={BRAND.violet} />
            <Text style={[styles.loadingText, { color: muted }]}>Finding today’s lesson…</Text>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.copyCol}>
              {slot ? (
                <>
                  {!!classLabel && (
                    <Text style={[styles.kicker, { color: BRAND.violet }]} numberOfLines={1}>
                      {classLabel}{slot.subject_name ? ` · ${slot.subject_name}` : ''}
                    </Text>
                  )}
                  <Text style={[styles.headline, { color: ink }]} numberOfLines={1}>
                    {topicTitle || 'Today’s topic is waiting'}
                  </Text>
                  <Text style={[styles.support, { color: muted }]} numberOfLines={1}>
                    {chapterTitle || 'Open to map timetable and curriculum.'}
                  </Text>
                </>
              ) : (
                <Text style={[styles.support, { color: muted }]} numberOfLines={2}>
                  Link timetable to see today’s topic in one tap.
                </Text>
              )}
            </View>
            <View style={styles.cta}>
              <LinearGradient
                colors={[BRAND.violetMid, BRAND.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaFill}
              >
                <Text style={styles.ctaText}>{topicTitle ? 'Continue' : slot ? 'Open' : 'Planner'}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>
        )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  cardShell: {
    borderRadius: 20,
  },
  cardInner: {
    padding: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  copyCol: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  headline: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  support: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  cta: {
    flexShrink: 0,
  },
  ctaFill: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    ...Platform.select({
      web: { boxShadow: '0 6px 14px rgba(108,99,255,0.24), inset 0 1px 0 rgba(255,255,255,0.28)' },
      default: {
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
});
