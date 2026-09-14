import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform,
  StatusBar, BackHandler, TouchableOpacity, Pressable, ScrollView,
  useWindowDimensions, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path, Ellipse } from 'react-native-svg';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, ZoomIn,
  useAnimatedStyle, useSharedValue, useAnimatedProps,
  withSpring, withTiming, withSequence, withRepeat, withDelay,
  interpolate, Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '@/src/hooks/useAuth';
import { AttendanceService, currentSession, localAttendanceDate } from '@/src/services/attendanceService';
import { LeaveService } from '@/src/services/commonServices';
import { useTheme } from '@/src/hooks/useTheme';
import * as Haptics from '@/src/utils/haptics';
import StaffHeader from '@/src/components/StaffHeader';
import StaffHero from '@/src/components/staff-hero/StaffHero';
import ViewAsBanner from '@/src/components/ViewAsBanner';
import { SCHOOL_CONFIG } from '@/src/constants/schoolConfig';
import { useEffectiveStaffId } from '@/src/hooks/useEffectiveStaffId';
import { usePersistedSWR } from '@/src/hooks/usePersistedSWR';
import { useStaffPortalConfig } from '@/src/hooks/useStaffPortalConfig';
import { Staff, StaffService } from '@/src/services/staffService';
import { schoolHeroSlidesService, type HeroSlideItem } from '@/src/services/schoolHeroSlidesService';
import { schoolStoriesService, type SchoolStoryAuthor } from '@/src/services/schoolStoriesService';
import StaffAttendanceQuickCard from '@/src/components/StaffAttendanceQuickCard';
import AcademicTodayCard from '@/src/components/AcademicTodayCard';
import { UpcomingEventsWidget } from '@/src/components/calendar/UpcomingEventsWidget';
import { clayCard } from '@/src/theme/clayStyles';
import { clayTokens } from '@/src/styles/clayTokens';
import { DailySparkWidget } from '@/src/components/content/DailySparkWidget';
import { usePopupUnreadCount } from '@/src/features/popups/popupUnreadStore';

const { width: SW, height: SH } = Dimensions.get('window');
const MENU_GAP = 16;
const IS_WEB = Platform.OS === 'web';
/** Cap card width on large web viewports so tiles stay scannable */
const MENU_CARD_W = IS_WEB && SW > 640 ? Math.min((SW - 40 - MENU_GAP) / 2, 228) : (SW - 40 - MENU_GAP) / 2;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  dark: {
    bg: '#080B14',
    bgCard: 'rgba(255,255,255,0.055)',
    bgCardElevated: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.08)',
    borderHigh: 'rgba(255,255,255,0.14)',
    text1: '#F0F2FF',
    text2: 'rgba(240,242,255,0.55)',
    text3: 'rgba(240,242,255,0.30)',
    shimmer: 'rgba(255,255,255,0.10)',
    orbA: 'rgba(108,99,255,0.14)',
    orbB: 'rgba(0,196,160,0.08)',
    orbC: 'rgba(255,77,106,0.06)',
    menuTextBg: '#0C0F1C',
    menuTextBorder: 'rgba(255,255,255,0.07)',
  },
  light: {
    bg: '#F0F2F8',
    bgCard: '#FFFFFF',
    bgCardElevated: '#FFFFFF',
    border: 'rgba(0,0,0,0.07)',
    borderHigh: 'rgba(0,0,0,0.12)',
    text1: '#0A0E1A',
    text2: 'rgba(10,14,26,0.55)',
    text3: 'rgba(10,14,26,0.32)',
    shimmer: 'rgba(255,255,255,0.80)',
    orbA: 'rgba(108,99,255,0.08)',
    orbB: 'rgba(0,196,160,0.06)',
    orbC: 'rgba(255,77,106,0.04)',
    menuTextBg: '#FFFFFF',
    menuTextBorder: 'rgba(0,0,0,0.06)',
  },
};

const ACCENT = {
  violet: '#6C63FF',
  violetMid: '#8B85FF',
  emerald: '#00C4A0',
  rose: '#FF4D6A',
  amber: '#FFB01A',
  blue: '#3D8EFF',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardMetrics {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  pendingLeaves: number;
  classId?: string;
  className?: string;
  sectionName?: string;
  session?: 'morning' | 'afternoon';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// ─── Background Orbs ─────────────────────────────────────────────────────────
const BgOrbs = React.memo(function BgOrbs({ isDark }: { isDark: boolean }) {
  const t = isDark ? D.dark : D.light;
  return (
    <Animated.View entering={FadeIn.duration(1000)} style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, { width: 340, height: 340, top: -100, right: -120, borderRadius: 170, backgroundColor: t.orbA }]} />
      <View style={[styles.orb, { width: 260, height: 260, top: 200, left: -120, borderRadius: 130, backgroundColor: t.orbB }]} />
      <View style={[styles.orb, { width: 200, height: 200, bottom: 280, right: -60, borderRadius: 100, backgroundColor: t.orbC }]} />
    </Animated.View>
  );
});

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Premium Claymorphic Graphics ─────────────────────────────────────────────
const ClayGraphic = React.memo(function ClayGraphic({ type, size, style, isDark }: { type: 'clock' | 'book' | 'pencil' | 'cap'; size: number; style ?: any; isDark: boolean }) {
  if (type === 'clock') {
    return (
      <View style={[{ width: size, height: size, position: 'absolute', zIndex: 1 }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <SvgGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#818CF8" />
              <Stop offset="100%" stopColor="#4F46E5" />
            </SvgGradient>
          </Defs>
          {/* Shadow */}
          <Circle cx="12" cy="13.5" r="10" fill="rgba(79, 70, 229, 0.25)" />
          {/* Base */}
          <Circle cx="12" cy="12" r="10" fill="url(#clockGrad)" />
          {/* Dial face */}
          <Circle cx="12" cy="12" r="7.5" fill={isDark ? '#1F2937' : '#FFFFFF'} />
          {/* Highlight on rim */}
          <Circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.2" />
          {/* Hands */}
          <Path d="M12 7 V12 H15.5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="12" r="1.5" fill="#4F46E5" />
        </Svg>
      </View>
    );
  }

  if (type === 'book') {
    return (
      <View style={[{ width: size, height: size, position: 'absolute', zIndex: 1 }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <SvgGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#EC4899" />
              <Stop offset="100%" stopColor="#BE185D" />
            </SvgGradient>
          </Defs>
          {/* Book Shadow */}
          <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v3H6.5a2.5 2.5 0 0 1-2.5-2.5z" fill="rgba(190, 24, 93, 0.2)" transform="translate(1, 1)" />
          <Path d="M6 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5v-15A3 3 0 0 1 6.5 2z" fill="rgba(190, 24, 93, 0.2)" transform="translate(1, 1)" />
          {/* Book cover base */}
          <Path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5v-15z" fill="url(#bookGrad)" />
          {/* Pages block */}
          <Path d="M20 2v15h-1V2h1z" fill={isDark ? '#374151' : '#F3F4F6'} />
          <Path d="M6.5 17H20v1H6.5a1.5 1.5 0 0 0 0 3H20v1H6.5A3.5 3.5 0 0 1 3 18.5v-1A2.5 2.5 0 0 1 6.5 17z" fill={isDark ? '#4B5563' : '#E5E7EB'} />
        </Svg>
      </View>
    );
  }

  if (type === 'pencil') {
    return (
      <View style={[{ width: size, height: size, position: 'absolute', zIndex: 1, transform: [{ rotate: '-45deg' }] }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <SvgGradient id="pencilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FBBF24" />
              <Stop offset="100%" stopColor="#D97706" />
            </SvgGradient>
            <SvgGradient id="eraserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#F472B6" />
              <Stop offset="100%" stopColor="#E11D48" />
            </SvgGradient>
          </Defs>
          {/* Base shadow */}
          <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="rgba(217, 119, 6, 0.2)" transform="translate(1, 1)" />

          {/* Pencil Shaft */}
          <Path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="url(#pencilGrad)" />
          {/* Lead Tip */}
          <Path d="M3 21h1.5l-1.5-1.5z" fill="#1F2937" />
          {/* Eraser */}
          <Path d="M20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="url(#eraserGrad)" />
          {/* Metal Band */}
          <Path d="M15.5 5.5 L18.5 8.5" stroke="#9CA3AF" strokeWidth="2" />
        </Svg>
      </View>
    );
  }

  if (type === 'cap') {
    return (
      <View style={[{ width: size, height: size, position: 'absolute', zIndex: 1 }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <SvgGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2DD4BF" />
              <Stop offset="100%" stopColor="#0F766E" />
            </SvgGradient>
          </Defs>
          {/* Shadow */}
          <Path d="M12 2 L22 7 L12 12 L2 7 Z" fill="rgba(15, 118, 110, 0.2)" transform="translate(1, 1)" />
          <Path d="M4 10.5 v4.5 A8 8 0 0 0 20 15 v-4.5" fill="rgba(15, 118, 110, 0.2)" transform="translate(1, 1)" />

          {/* Rhombus top */}
          <Path d="M12 2 L22 7 L12 12 L2 7 Z" fill="url(#capGrad)" />
          {/* Skull cap */}
          <Path d="M6 10.5 v3.5 A6 6 0 0 0 18 14 v-3.5" fill="url(#capGrad)" />
          <Path d="M6 10.5 L12 13.5 L18 10.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          {/* Tassel */}
          <Path d="M12 7 L17 11.5 v4.5" fill="none" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
          <Circle cx="17" cy="16.5" r="1" fill="#FBBF24" />
        </Svg>
      </View>
    );
  }

  return null;
});

// ─── Circular Attendance Arc ──────────────────────────────────────────────────
const AttendanceArc = React.memo(function AttendanceArc({
  pct,
  isDark,
  size,
  stroke,
}: {
  pct: number;
  isDark: boolean;
  size ?: number;
  stroke ?: number;
}) {
  const SIZE = size || 210;
  const STROKE = stroke || 14;
  const compact = SIZE <= 150;
  const R = (SIZE - STROKE) / 2 - (compact ? 12 : 20);
  const CIRC = 2 * Math.PI * R;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const animatedPct = useSharedValue(0);

  useEffect(() => {
    animatedPct.value = withTiming(pct, { duration: 1000 });
  }, [pct]);

  const animatedProps = useAnimatedProps(() => {
    const currentFill = (animatedPct.value / 100) * CIRC;
    return {
      strokeDasharray: `${currentFill > 0 ? currentFill : 0.01} ${CIRC}`,
    };
  });

  const textColor = isDark ? '#FFFFFF' : '#1E293B';
  const subTextColor = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';
  const trackColor = isDark ? 'rgba(255,255,255,0.06)' : '#EBF0F6';

  // Calculate dynamic position of the 3D thumb dot based on current fill percentage
  const angleRad = ((pct / 100) * 360) * Math.PI / 180;
  const dotX = cx + R * Math.cos(angleRad);
  const dotY = cy + R * Math.sin(angleRad);

  return (
    <View style={[{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }]}>
      <Svg width={SIZE} height={SIZE} style={[{ transform: [{ rotate: '-90deg' }] }]}>
        {/* Soft shadow outside to simulate clay extrusion */}
        <Circle cx={cx} cy={cy} r={R + STROKE / 2 + 10} fill="none" stroke={isDark ? 'rgba(0,0,0,0.3)' : 'rgba(150,170,200,0.15)'} strokeWidth={14} />
        {/* Bright highlight inner ring for bevel effect */}
        <Circle cx={cx} cy={cy} r={R + STROKE / 2 + 3} fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'} strokeWidth={6} />

        {/* The Trough Base (recessed background track) */}
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={trackColor} strokeWidth={STROKE + 6} />

        {/* Trough Inner Shadows to give hollow indent look */}
        <Circle cx={cx} cy={cy} r={R} fill="none" stroke={isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.05)'} strokeWidth={STROKE + 6} />
        <Circle cx={cx} cy={cy} r={R + 2} fill="none" stroke={isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)'} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={R - 2} fill="none" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)'} strokeWidth={2} />

        {/* Progress Arc */}
        <AnimatedCircle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="#278261"
          strokeWidth={STROKE}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />

        {/* 3D Green Ball Thumb */}
        <Circle
          cx={dotX}
          cy={dotY}
          r={STROKE - 2}
          fill="#278261"
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      </Svg>
      {/* Center Text */}
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: compact ? 30 : 44, fontWeight: '800', color: textColor, letterSpacing: -1 }}>
          {pct}
          <Text style={{ fontSize: compact ? 15 : 22, color: subTextColor, fontWeight: '700' }}>%</Text>
        </Text>
        <Text style={{ fontSize: compact ? 10 : 13, fontWeight: '700', color: subTextColor, marginTop: -2 }}>present today</Text>
      </View>
    </View>
  );
});

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = React.memo(function StatCard({ value, label, type, isDark }: { value: number | string; label: string; type: 'present' | 'absent' | 'pending'; isDark: boolean }) {
  const config = {
    present: {
      icon: 'checkmark-circle-outline',
      color: '#278261', // Darker green for icon
      bg: isDark ? 'rgba(39, 130, 97, 0.2)' : '#E3F2ED',
      shadowColor: '#278261',
    },
    absent: {
      icon: 'close-circle-outline',
      color: '#D14343', // Red
      bg: isDark ? 'rgba(209, 67, 67, 0.2)' : '#FCE8E8',
      shadowColor: '#D14343',
    },
    pending: {
      icon: 'help-circle-outline',
      color: '#D97321', // Orange
      bg: isDark ? 'rgba(217, 115, 33, 0.2)' : '#FDF0E5',
      shadowColor: '#D97321',
    }
  }[type];

  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const labelColor = isDark ? 'rgba(255,255,255,0.7)' : '#64748B';
  const valueColor = isDark ? '#FFFFFF' : '#1E293B';

  return (
    <View style={[
      {
        backgroundColor: cardBg,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : `${config.shadowColor}18`,
        ...(Platform.OS === 'web' ? {
          boxShadow: isDark
            ? '0px 5px 14px rgba(0,0,0,0.22)'
            : `0px 5px 14px ${config.shadowColor}13`
        } : {
          shadowColor: config.shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 7,
          elevation: 2,
        }),
      }
    ]}>
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 9,
        backgroundColor: config.bg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 9,
      }}>
        <Ionicons name={config.icon as any} size={17} color={config.color} />
      </View>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: labelColor }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: valueColor, letterSpacing: -0.5 }}>{value}</Text>
    </View>
  );
});

// ─── Attendance Hero Card ─────────────────────────────────────────────────────
const AttendanceHero = React.memo(function AttendanceHero({ data, onPress, isDark }: { data: DashboardMetrics | null; onPress: () => void; isDark: boolean }) {
  const { width: winWidth } = useWindowDimensions();
  const isWideLayout = IS_WEB && winWidth > 820;

  const total = data?.totalStudents || 0;
  const present = data?.presentToday || 0;
  const absent = data?.absentToday || 0;
  const unmarked = Math.max(0, total - present - absent);
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const pressScale = useSharedValue(1);
  const hoverLift = useSharedValue(0);

  const anim = useAnimatedStyle(() => {
    const hoverScale = IS_WEB ? interpolate(hoverLift.value, [0, 1], [1, 1.01]) : 1;
    return {
      transform: [{ scale: pressScale.value * hoverScale }]
    };
  });

  const sessionLabel = data?.session === 'afternoon' ? 'Afternoon' : 'Morning';
  const classLabel = [data?.className, data?.sectionName].filter(Boolean).join(' · ');
  let statusText = total === 0
    ? `No ${sessionLabel.toLowerCase()} class on the timetable yet`
    : unmarked === 0
      ? `${sessionLabel} is fully marked — well done`
      : `${sessionLabel} · ${unmarked} student${unmarked !== 1 ? 's' : ''} still waiting`;
  let statusColor = total === 0 ? '#6B7590' : unmarked === 0 ? '#00C4A0' : '#E8520A';

  const textColor = isDark ? '#F0F2FF' : '#2A3142';
  const subTextColor = isDark ? 'rgba(240,242,255,0.58)' : '#6B7590';
  const classChipText = isDark ? '#C7D2FE' : '#4338CA';
  const classChipIcon = isDark ? '#A5B4FC' : ACCENT.violet;

  const handlePressIn = () => {
    pressScale.value = withTiming(0.98, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 150 });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(180).duration(320)}
      style={[anim, clayCard(isDark, 'md'), { marginBottom: 16 }]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onHoverIn={() => {
          if (IS_WEB) hoverLift.value = withTiming(1, { duration: 180 });
        }}
        onHoverOut={() => {
          if (IS_WEB) hoverLift.value = withTiming(0, { duration: 220 });
        }}
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          padding: isWideLayout ? 22 : 18,
          ...(IS_WEB ? { cursor: 'pointer' as const } : null),
        }}
      >
        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(108,99,255,0.20)' : clayTokens.colors.brand.violetSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="people" size={18} color={ACCENT.violet} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, letterSpacing: -0.3 }}>{"Today's class"}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: subTextColor, marginTop: 1 }} numberOfLines={1}>
                {classLabel || 'Your classroom'}
              </Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : clayTokens.colors.brand.violetSoft,
          }}>
            <Ionicons name="people-outline" size={14} color={classChipIcon} style={{ marginRight: 5 }} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: classChipText }}>{total} student{total !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, minHeight: 24 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor, marginRight: 8 }} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: subTextColor, flex: 1 }} numberOfLines={1}>{statusText}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <View style={{
            width: 132,
            height: 132,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : '#FAFBFD',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,116,139,0.07)',
          }}>
            <ClayGraphic type="clock" size={22} isDark={isDark} style={{ top: 9, left: 9 }} />
            <AttendanceArc pct={pct} isDark={isDark} size={126} stroke={10} />
          </View>
          <View style={{ flex: 1, marginLeft: 12, gap: 7 }}>
            <StatCard value={present} label="Present" type="present" isDark={isDark} />
            <StatCard value={absent} label="Absent" type="absent" isDark={isDark} />
            <StatCard value={unmarked} label="Not marked" type="pending" isDark={isDark} />
          </View>
        </View>

        <LinearGradient
          colors={[ACCENT.violetMid, ACCENT.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 13,
            ...(Platform.OS === 'web' ? {
              boxShadow: '0px 8px 18px rgba(108,99,255,0.28), inset 0px 1px 0px rgba(255,255,255,0.30)'
            } : {
              shadowColor: ACCENT.violet,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.28,
              shadowRadius: 10,
              elevation: 5,
            }),
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.1 }}>Mark attendance</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 7 }} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});


// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = React.memo(function SectionLabel({ label, isDark }: { label: string; isDark: boolean }) {
  const t = isDark ? D.dark : D.light;
  return (
    <View style={styles.sectionLabel}>
      <LinearGradient colors={[ACCENT.violet, ACCENT.emerald]} style={styles.sectionAccent} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Text style={[styles.sectionLabelText, { color: t.text2 }]}>{label}</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ENHANCED MENU CARD SYSTEM ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

type TileName = keyof typeof clayTokens.colors.tiles;
type CardPatternType = 'rings' | 'diagonal' | 'dots' | 'arc';

interface MenuConfig {
  icon: React.ReactNode;
  category: string;
  tile: TileName;
}

const MENU_ICON = { color: '#FFFFFF', size: 26 } as const;

const MENU_CONFIGS: Record<string, MenuConfig> = {
  notices: {
    icon: <Ionicons name="megaphone" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'UPDATES',
    tile: 'indigo',
  },
  updates: {
    icon: <Ionicons name="notifications" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'ALERTS',
    tile: 'bronze',
  },
  stories: {
    icon: <Ionicons name="ellipse" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'STORIES',
    tile: 'forest',
  },
  messages: {
    icon: <Ionicons name="chatbubbles" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'COMMS',
    tile: 'burgundy',
  },
  academic: {
    icon: <Ionicons name="book" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'ACADEMICS',
    tile: 'sapphire',
  },
  diary: {
    icon: <FontAwesome5 name="book" size={22} color={MENU_ICON.color} />,
    category: 'RECORDS',
    tile: 'copper',
  },
  anecdotes: {
    icon: <Ionicons name="journal" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'NOTES',
    tile: 'plum',
  },
  intelligence: {
    icon: <Ionicons name="analytics" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'INSIGHTS',
    tile: 'teal',
  },
  events: {
    icon: <Ionicons name="qr-code" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'EVENTS',
    tile: 'slate',
  },
  admissions: {
    icon: <Ionicons name="person-add" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'ENROL',
    tile: 'ochre',
  },
  timetable: {
    icon: <Ionicons name="calendar" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'SCHEDULE',
    tile: 'rosewood',
  },
  portfolio: {
    icon: <Ionicons name="id-card" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'STUDENTS',
    tile: 'navy',
  },
  rollNumbers: {
    icon: <Ionicons name="list-circle" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'ROSTER',
    tile: 'indigo',
  },
  attendance: {
    icon: <FontAwesome5 name="fingerprint" size={22} color={MENU_ICON.color} />,
    category: 'TRACKING',
    tile: 'bronze',
  },
  leaves: {
    icon: <FontAwesome5 name="calendar-check" size={20} color={MENU_ICON.color} />,
    category: 'APPROVALS',
    tile: 'copper',
  },
  results: {
    icon: <MaterialIcons name="assessment" size={26} color={MENU_ICON.color} />,
    category: 'MARKS',
    tile: 'forest',
  },
  omrScanner: {
    icon: <Ionicons name="scan" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'GRADING',
    tile: 'teal',
  },
  omrReview: {
    icon: <Ionicons name="eye" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'REVIEW',
    tile: 'plum',
  },
  omrKeys: {
    icon: <Ionicons name="key" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'KEYS',
    tile: 'navy',
  },
  progressCards: {
    icon: <Ionicons name="document-text" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'REPORTS',
    tile: 'ochre',
  },
  complaints: {
    icon: <Ionicons name="chatbubble-ellipses" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'SUPPORT',
    tile: 'slate',
  },
  fineRequest: {
    icon: <MaterialCommunityIcons name="cash-plus" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'FINANCE',
    tile: 'rosewood',
  },
  lms: {
    icon: <MaterialIcons name="cloud-upload" size={26} color={MENU_ICON.color} />,
    category: 'CONTENT',
    tile: 'sapphire',
  },
  daily: {
    icon: <Ionicons name="sunny" size={MENU_ICON.size} color={MENU_ICON.color} />,
    category: 'DAILY',
    tile: 'ochre',
  },
  payslips: {
    icon: <FontAwesome5 name="file-invoice-dollar" size={20} color={MENU_ICON.color} />,
    category: 'PAY',
    tile: 'bronze',
  },
};

// ─── Card Pattern Decoration ──────────────────────────────────────────────────
// Each pattern type adds a unique geometric decoration to the gradient zone
const CardPattern = React.memo(function CardPattern({ type, accentLight }: { type: CardPatternType; accentLight: string }) {
  if (type === 'rings') {
    // Concentric quarter-arc rings in the bottom-right corner
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 60 + i * 36,
              height: 60 + i * 36,
              borderRadius: (60 + i * 36) / 2,
              borderWidth: 1.2,
              borderColor: `rgba(255,255,255,${0.14 - i * 0.04})`,
              bottom: -(30 + i * 18),
              right: -(30 + i * 18),
            }}
          />
        ))}
        <View style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', top: 18, right: 14 }} />
      </View>
    );
  }

  if (type === 'diagonal') {
    // Diagonal ruled lines going top-right to bottom-left
    return (
      <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              height: 1,
              width: 160,
              backgroundColor: 'rgba(255,255,255,0.09)',
              top: -20 + i * 28,
              right: -30,
              transform: [{ rotate: '-38deg' }],
            }}
          />
        ))}
        <View style={{ position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', top: 16, right: 16 }} />
        <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.14)', top: 32, right: 32 }} />
      </View>
    );
  }

  if (type === 'dots') {
    // 3×3 dot grid in the top-right
    const dots = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        dots.push(
          <View
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: `rgba(255,255,255,${0.18 - row * 0.04})`,
              top: 14 + row * 14,
              right: 14 + col * 14,
            }}
          />
        );
      }
    }
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {dots}
        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.14)', bottom: -20, left: -20 }} />
      </View>
    );
  }

  if (type === 'arc') {
    // Single large arc sweeping from top-right corner
    return (
      <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
        <View
          style={{
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: 55,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.13)',
            top: -44,
            right: -44,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.09)',
            top: -22,
            right: -22,
          }}
        />
        <View style={{ position: 'absolute', width: 9, height: 9, borderRadius: 4.5, backgroundColor: 'rgba(255,255,255,0.22)', top: 18, right: 52 }} />
        <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.16)', top: 30, right: 38 }} />
      </View>
    );
  }
  return null;
});

// ─── Live Badge (notification indicator) ─────────────────────────────────────
const LiveBadge = React.memo(function LiveBadge({ count }: { count: string }) {
  return (
    <View style={mc.badgeOuter}>
      <View style={mc.badgePulseDot} />
      <View style={mc.badgeInner}>
        <Text style={mc.badgeCountText}>{count}</Text>
      </View>
    </View>
  );
});

// ─── Enhanced Menu Card ───────────────────────────────────────────────────────
function getStaffClayColors(configKey: string, isDark: boolean) {
  const tileName = MENU_CONFIGS[configKey]?.tile ?? 'indigo';
  const tile = clayTokens.colors.tiles[tileName];
  return {
    bg: isDark ? tile.dark : tile.bg,
    shadowColor: tile.shadow,
  };
}

const MenuCard = React.memo(function MenuCard({
  title,
  subtitle,
  configKey,
  badge,
  onPress,
  index,
  isDark,
}: {
  title: string;
  subtitle: string;
  configKey: string;
  badge ?: string;
  onPress: () => void;
  index: number;
  isDark: boolean;
}) {
  const cfg = MENU_CONFIGS[configKey] ?? MENU_CONFIGS.notices;
  const borderRadius = IS_WEB ? 28 : 24;

  const pressScale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const hoverLift = useSharedValue(0);

  const wrapperStyle = useAnimatedStyle(() => {
    const y = IS_WEB ? interpolate(hoverLift.value, [0, 1], [0, -3]) : translateY.value;
    const hoverScale = IS_WEB ? interpolate(hoverLift.value, [0, 1], [1, 1.02]) : 1;
    return {
      transform: [{ translateY: y }, { scale: pressScale.value * hoverScale }],
    };
  });

  const clayStyle = useMemo(() => {
    const { bg, shadowColor } = getStaffClayColors(configKey, isDark);

    if (Platform.OS === 'web') {
      return {
        backgroundColor: bg,
        borderRadius,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.45)',
        boxShadow:
          `0px 8px 18px ${shadowColor}33, ` +
          `-5px -5px 12px ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)'}, ` +
          `inset 2px 2px 4px rgba(255, 255, 255, 0.45), ` +
          `inset -2.5px -2.5px 5px rgba(0, 0, 0, 0.16)`
      };
    }

    return {
      backgroundColor: bg,
      borderRadius,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.45)',
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.45 : 0.28,
      shadowRadius: 12,
      elevation: 6,
    };
  }, [configKey, isDark, borderRadius]);

  const handlePressIn = () => {
    pressScale.value = withTiming(0.97, { duration: 90 });
    translateY.value = withTiming(1.5, { duration: 90 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 110 });
    translateY.value = withTiming(0, { duration: 110 });
  };

  return (
    <Animated.View
      entering={
        FadeInUp
          .delay(160 + Math.min(index, 9) * 40)
          .duration(320)
      }
      style={[
        wrapperStyle,
        clayStyle,
        {
          width: MENU_CARD_W,
          height: IS_WEB ? 144 : 132,
          position: 'relative',
          overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        onPress={onPress}
        onHoverIn={() => {
          if (IS_WEB) hoverLift.value = withTiming(1, { duration: 180 });
        }}
        onHoverOut={() => {
          if (IS_WEB) hoverLift.value = withTiming(0, { duration: 220 });
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web' && { cursor: 'pointer' },
        ]}
      >
        {/* Tactile claymorphic highlight linear gradient */}
        <LinearGradient
          colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(0, 0, 0, 0.15)'] : ['rgba(255, 255, 255, 0.26)', 'rgba(0, 0, 0, 0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
          pointerEvents="none"
        />

        {/* Abstract Background graphics */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: IS_WEB ? 90 : 80,
            height: IS_WEB ? 90 : 80,
            borderRadius: IS_WEB ? 45 : 40,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            bottom: IS_WEB ? -20 : -15,
            right: IS_WEB ? -20 : -15,
            zIndex: 1,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: IS_WEB ? 44 : 38,
            height: IS_WEB ? 44 : 38,
            borderRadius: IS_WEB ? 22 : 19,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)',
            bottom: IS_WEB ? 40 : 35,
            right: IS_WEB ? -10 : -8,
            zIndex: 1,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: IS_WEB ? 24 : 18,
            height: IS_WEB ? 24 : 18,
            borderRadius: IS_WEB ? 12 : 9,
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            bottom: IS_WEB ? 45 : 38,
            right: IS_WEB ? 25 : 20,
            zIndex: 1,
            ...(Platform.OS === 'web' ? {
              boxShadow: '1px 2px 3px rgba(0,0,0,0.06), inset 1px 1px 2px rgba(255,255,255,0.2)'
            } : {})
          }}
        />

        {/* ── Icon (top-left, raised disc) ── */}
        <View style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 2
        }}>
          <View style={{
            width: IS_WEB ? 42 : 36,
            height: IS_WEB ? 42 : 36,
            borderRadius: IS_WEB ? 14 : 11,
            backgroundColor: 'rgba(255,255,255,0.22)',
            borderColor: 'rgba(255,255,255,0.32)',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            ...(Platform.OS === 'web' ? {
              boxShadow: '1px 2px 4px rgba(0,0,0,0.12), inset 1px 1px 2px rgba(255,255,255,0.35)'
            } : {})
          }}>
            <View style={{ transform: [{ scale: IS_WEB ? 0.78 : 0.68 }] }}>
              {cfg.icon}
            </View>
          </View>
          {/* Badge position directly absolute over the icon */}
          {badge && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: '#FF3D5C',
              borderRadius: 8,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderWidth: 1.5,
              borderColor: isDark ? '#121824' : '#FFFFFF',
              zIndex: 3,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 8.5, fontWeight: '900' }}>{badge}</Text>
            </View>
          )}
        </View>

        {/* ── Category tag (top-right, inset capsule) ── */}
        <View style={[
          mc.categoryTag,
          {
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.15)',
            borderColor: 'rgba(255,255,255,0.15)',
            borderWidth: 1,
            marginBottom: 0,
            ...(Platform.OS === 'web' ? {
              boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2), inset -1px -1px 2px rgba(255,255,255,0.1)'
            } : {})
          }
        ]}>
          <View style={[mc.categoryDot, { backgroundColor: '#FFFFFF' }]} />
          <Text style={[mc.categoryText, { color: '#FFFFFF', fontSize: 8, fontWeight: '900' }]}>{cfg.category}</Text>
        </View>

        {/* ── Bottom Text info panel ── */}
        <View style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 42,
          zIndex: 2,
        }}>
          <Text
            style={{
              fontSize: IS_WEB ? 15 : 13.5,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.2
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: IS_WEB ? 10.5 : 9.5,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.78)',
              marginTop: 2
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        {/* ── Chevron button (bottom-right) ── */}
        <View style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          width: IS_WEB ? 26 : 22,
          height: IS_WEB ? 26 : 22,
          borderRadius: IS_WEB ? 13 : 11,
          backgroundColor: 'rgba(255,255,255,0.22)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.32)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          ...(Platform.OS === 'web' ? {
            boxShadow: '1px 2px 4px rgba(0,0,0,0.12), inset 1px 1px 2px rgba(255,255,255,0.35)'
          } : {}),
        }}>
          <Ionicons name="chevron-forward" size={IS_WEB ? 13 : 10} color="#FFFFFF" />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function StaffDashboard() {
  // The staff area is a single MaterialTopTabs (pager) navigator; this returns
  // that navigator so we can switch tabs the same way StaffFooter does.
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const t = isDark ? D.dark : D.light;
  const { staffId, isViewingAsAdmin, viewAsName, userId: viewAsUserId, actorUserId } = useEffectiveStaffId();
  const { payslipsEnabled } = useStaffPortalConfig();
  const popupUnread = usePopupUnreadCount();
  const [viewedStaff, setViewedStaff] = useState<Staff | null>(null);

  useEffect(() => {
    if (!isViewingAsAdmin || !staffId) { setViewedStaff(null); return; }
    StaffService.getById(staffId).then(setViewedStaff).catch(() => setViewedStaff(null));
  }, [isViewingAsAdmin, staffId]);

  const { data, loading: metricsLoading, isRefreshing: metricsRefreshing, refetch } = usePersistedSWR<DashboardMetrics>({
    cacheKey: `staff-dashboard-${staffId ?? 'self'}`,
    userId: user?.userId,
    ttlMs: 120_000,
    persist: !isViewingAsAdmin,
    enabled: !!user,
    revalidateOnMount: true,
    fetcher: async () => {
      const session = currentSession();
      const date = localAttendanceDate();
      const [pendingLeaves, myClass] = await Promise.all([
        LeaveService.getAll({ status: 'pending' }),
        AttendanceService.getMyClass(date, staffId, session),
      ]);
      let studentCount = 0, presentCount = 0, absentCount = 0;
      let detectedClassId: string | undefined;
      let className: string | undefined;
      let sectionName: string | undefined;
      if (myClass) {
        detectedClassId = myClass.class_section_id;
        className = myClass.class_name || undefined;
        sectionName = myClass.section_name || undefined;
        studentCount = myClass.total_students;
        const sessionKey = myClass.session === 'afternoon' ? 'afternoon_status' : 'morning_status';
        presentCount = myClass.students.filter((student: any) =>
          ['present', 'late', 'half_day'].includes(student[sessionKey])
        ).length;
        absentCount = myClass.students.filter((student: any) => student[sessionKey] === 'absent').length;
      }
      return {
        totalStudents: studentCount,
        presentToday: presentCount,
        absentToday: absentCount,
        pendingLeaves: pendingLeaves.length,
        classId: detectedClassId,
        className,
        sectionName,
        session,
      };
    },
  });
  const loading = metricsLoading && !data;

  const { data: heroSlides, refetch: refetchSlides } = usePersistedSWR<HeroSlideItem[]>({
    cacheKey: 'staff-hero-slides',
    userId: user?.userId,
    ttlMs: 120_000,
    persist: !isViewingAsAdmin,
    enabled: !!user,
    revalidateOnMount: true,
    fetcher: () => schoolHeroSlidesService.listActive(),
  });

  const { data: schoolStories, refetch: refetchStories } = usePersistedSWR<SchoolStoryAuthor[]>({
    cacheKey: 'staff-school-stories',
    userId: user?.userId,
    ttlMs: 60_000,
    persist: !isViewingAsAdmin,
    enabled: !!user,
    revalidateOnMount: true,
    fetcher: () => schoolStoriesService.list(),
  });

  useFocusEffect(useCallback(() => {
    // Only the teacher's own home screen should treat hardware back as "exit app".
    // When an admin is viewing this as another staff member's portal, this screen
    // sits on top of Manage Staff in the stack — hardware back must pop to it
    // normally instead of quitting the app.
    if (isViewingAsAdmin) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { BackHandler.exitApp(); return true; });
    return () => sub.remove();
  }, [isViewingAsAdmin]));

  const menuItems = useMemo(() => [
    { title: 'Notices', subtitle: 'School updates', configKey: 'notices', route: '/staff/notices' },
    { title: 'SchoolIMS Daily', subtitle: "Today's thought & news", configKey: 'daily', route: '/Screen/schoolDaily' },
    { title: 'Updates', subtitle: 'Important popups', configKey: 'updates', route: '/staff/updates', badge: popupUnread ? `${popupUnread}` : undefined },
    { title: 'School Stories', subtitle: 'Post 24-hour rings', configKey: 'stories', route: '/staff/school-stories' },
    { title: 'Messages', subtitle: 'In-app chat', configKey: 'messages', route: '/staff/messages' },
    { title: 'Academic Today', subtitle: "Today's topic in 1 tap", configKey: 'academic', route: '/staff/academic-today' },
    { title: 'Diary', subtitle: 'Photo, voice & homework', configKey: 'diary', route: '/staff/diary' },
    { title: 'Anecdotes', subtitle: 'Observation & Intel', configKey: 'anecdotes', route: '/staff/anecdotes' },
    { title: 'Intelligence', subtitle: 'Student Cockpit', configKey: 'intelligence', route: '/staff/student-intelligence' },
    { title: 'Event Ops', subtitle: 'QR, tasks, attendance', configKey: 'events', route: '/staff/events' },
    { title: 'Admissions', subtitle: 'Enquiry pipeline', configKey: 'admissions', route: '/staff/admissions' },
    { title: 'Timetable', subtitle: 'Class schedule', configKey: 'timetable', route: '/staff/timetable' },
    { title: 'Student Portfolio', subtitle: 'First-class profiles', configKey: 'portfolio', route: '/staff/student-portfolio' },
    { title: 'Roll Numbers', subtitle: 'Set your class order', configKey: 'rollNumbers', route: '/staff/roll-numbers' },
    { title: 'My Attendance', subtitle: 'History & reports', configKey: 'attendance', route: '/staff/attendance' },
    { title: 'Leaves', subtitle: 'Review approvals', configKey: 'leaves', route: '/staff/leaves', badge: data?.pendingLeaves ? `${data.pendingLeaves}` : undefined },
    { title: 'Results', subtitle: 'Enter & view marks', configKey: 'results', route: '/staff/results' },
    { title: 'OMR Scanner', subtitle: 'Camera bubble grading', configKey: 'omrScanner', route: '/staff/omr-scanner' },
    { title: 'OMR Review', subtitle: 'Verify flagged sheets', configKey: 'omrReview', route: '/staff/omr-review' },
    { title: 'OMR Answer Keys', subtitle: 'Map and publish keys', configKey: 'omrKeys', route: '/staff/omr-answer-key' },
    { title: 'Progress Cards', subtitle: 'Class-teacher card assistant', configKey: 'progressCards', route: '/staff/progress-card-assistant' },
    { title: 'Complaints', subtitle: 'Student issues', configKey: 'complaints', route: '/staff/complaints' },
    { title: 'Fine Request', subtitle: 'Damage & penalties', configKey: 'fineRequest', route: '/staff/fine-request' },
    { title: 'LMS', subtitle: 'Upload resources', configKey: 'lms', route: '/staff/lms-upload' },
    ...(payslipsEnabled ? [{ title: 'Payslips', subtitle: 'Salary & docs', configKey: 'payslips', route: '/staff/payslip' }] : []),
  ], [data?.pendingLeaves, payslipsEnabled, popupUnread]);

  const navigateToStaffRoute = useCallback((route: string) => {
    // Route name = last path segment (e.g. '/staff/manage-students' -> 'manage-students'),
    // which is the screen name registered in app/staff/_layout.tsx.
    const screen = route.replace(/^\/staff\//, '').split('?')[0];
    const params = isViewingAsAdmin
      ? { staffId: staffId || '', viewAsName: viewAsName || '', viewAsUserId: viewAsUserId || '', viewAsActorId: actorUserId || '' }
      : undefined;

    // Switch tabs via the tab navigator's own navigation object — the same call
    // StaffFooter uses. Expo Router's global router.push('/staff/..') resolves
    // sibling tabs to the wrong pager index on web; a full document reload was the
    // old band-aid, but it hard-404s on hosts without SPA fallback. jumpTo-style
    // navigation stays client-side and lands on the exact screen on every platform.
    (navigation as any).navigate(screen, params);
  }, [isViewingAsAdmin, navigation, staffId, viewAsName, viewAsUserId, actorUserId]);

  const headerScrollY = useSharedValue(60);

  const handleLeavesPress = useCallback(() => {
    navigateToStaffRoute('/staff/leaves');
  }, [navigateToStaffRoute]);

  const handleUpdatesPress = useCallback(() => {
    navigateToStaffRoute('/staff/updates');
  }, [navigateToStaffRoute]);

  const handleNotificationsPress = useCallback(() => {
    navigateToStaffRoute('/staff/notices');
  }, [navigateToStaffRoute]);

  const handleManageStudentsPress = useCallback(() => {
    navigateToStaffRoute('/staff/manage-students');
  }, [navigateToStaffRoute]);

  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Promise.all([refetch(), refetchSlides(), refetchStories()]);
  }, [refetch, refetchSlides, refetchStories]);

  const firstName = (isViewingAsAdmin ? viewAsName : user?.displayName)?.split(' ')[0] || 'Teacher';
  const roleLine = (() => {
    const classLabel = [data?.className, data?.sectionName].filter(Boolean).join(' ');
    if (classLabel) return `Class ${classLabel}`;
    if (isViewingAsAdmin) return viewedStaff?.designation_name || viewedStaff?.designation || 'Staff';
    return user?.role?.name || 'Staff';
  })();
  const photoUrl = isViewingAsAdmin ? viewedStaff?.photo_url : user?.photoUrl;

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <BgOrbs isDark={isDark} />
      <StaffHeader
        title="Staff Portal"
        subtitle={(isViewingAsAdmin ? viewAsName : user?.displayName) || 'Teacher'}
        scrollY={headerScrollY}
      />
      <Animated.ScrollView
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={metricsRefreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT.violet}
            colors={[ACCENT.violet]}
            progressBackgroundColor={isDark ? '#111827' : '#FFFFFF'}
          />
        )}
      >
        <View style={styles.heroBand}>
          {isViewingAsAdmin && (
            <View style={styles.heroBannerPad}>
              <ViewAsBanner name={viewAsName} />
            </View>
          )}
          <StaffHero
            firstName={firstName}
            roleLine={roleLine}
            chipLabel={SCHOOL_CONFIG.name}
            photoUrl={photoUrl}
            pendingLeaves={data?.pendingLeaves || 0}
            unreadUpdates={popupUnread || 0}
            slides={heroSlides ?? []}
            stories={schoolStories ?? []}
            canAddStories={!isViewingAsAdmin}
            addPhotoUrl={photoUrl}
            disableAccountSwitch={isViewingAsAdmin}
            onReviewLeaves={handleLeavesPress}
            onViewUpdates={handleUpdatesPress}
            onViewNotifications={handleNotificationsPress}
            onPublished={() => { void refetchStories(); }}
          />
        </View>
        <View style={styles.body}>
          {!isViewingAsAdmin && <StaffAttendanceQuickCard isDark={isDark} />}
          <UpcomingEventsWidget role="staff" />
          <AcademicTodayCard
            isDark={isDark}
            onPress={() => navigateToStaffRoute('/staff/academic-today')}
          />
          <AttendanceHero
            data={data}
            onPress={handleManageStudentsPress}
            isDark={isDark}
          />
          <DailySparkWidget />
          <SectionLabel label="QUICK ACTIONS" isDark={isDark} />
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <MenuCard
                key={item.route}
                title={item.title}
                subtitle={item.subtitle}
                configKey={item.configKey}
                badge={(item as any).badge}
                onPress={() => {
                  if (item.route.startsWith('/Screen/')) {
                    router.push(item.route as any);
                    return;
                  }
                  navigateToStaffRoute(item.route);
                }}
                index={index}
                isDark={isDark}
              />
            ))}
          </View>
          <View style={{ height: 90 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Menu Card Styles (mc) ────────────────────────────────────────────────────
const mc = StyleSheet.create({
  // Outer shell
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    ...(IS_WEB ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)' } : {}),
  },
  outerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },

  // ── Gradient Zone ──────────────────────────────────────────────────
  gradZone: {
    height: IS_WEB ? 124 : 118,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradZoneVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  topGloss: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 1,
  },

  // Badge (notification)
  badgePosition: {
    position: 'absolute',
    top: 11,
    right: 11,
    zIndex: 20,
  },
  badgeOuter: {
    position: 'relative',
  },
  badgePulseDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FF3D5C',
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  badgeInner: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.40)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Icon container
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconGlowBlob: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  iconDisc: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.45)',
      },
      default: {
        shadowColor: 'rgba(0,0,0,0.35)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
    }),
  },
  iconDiscHighlight: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.60)',
    borderRadius: 1,
  },

  // ── Accent Divider ─────────────────────────────────────────────────
  accentDivider: {
    height: 2.5,
  },

  // ── Text Zone ──────────────────────────────────────────────────────
  textZone: {
    paddingTop: 13,
    paddingHorizontal: 14,
    paddingBottom: 18,
    minHeight: IS_WEB ? 108 : 92,
    justifyContent: 'flex-start',
    gap: 2,
  },

  // Category tag: capsule with colored dot
  categoryTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    opacity: 0.90,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
  },

  // Title + arrow
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.45,
    flex: 1,
    marginRight: 8,
  },
  arrowChip: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Subtitle
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.05,
    lineHeight: IS_WEB ? 16 : 15,
    marginTop: 2,
    flexShrink: 1,
  },

  webHint: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 6,
    opacity: 0.85,
  },

  // Micro accent bar at bottom of text zone
  microBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    opacity: 0.8,
  },
});

// ─── Shared Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  heroBand: { backgroundColor: '#15245C', paddingTop: 76 },
  heroBannerPad: { paddingHorizontal: 18, paddingBottom: 8 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  orb: { position: 'absolute' },

  // ── Hero Banner ──────────────────────────────────────────────────────────
  heroBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 4 },
  heroBannerLeft: { flex: 1, paddingRight: 16 },
  dateBadge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  dateBadgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 },
  greetLine: { fontSize: 14, fontWeight: '500', letterSpacing: 0.1, marginBottom: 3 },
  nameLine: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8, lineHeight: 30 },
  avatarBubble: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: ACCENT.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.40, shadowRadius: 14, elevation: 10 },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },

  // ── Leave Alert ──────────────────────────────────────────────────────────
  leaveAlert: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 14 },
  leaveAlertLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaveAlertDot: { position: 'absolute', left: -2, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT.amber },
  leaveAlertIconBox: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  leaveAlertTitle: { fontSize: 13.5, fontWeight: '700', color: ACCENT.amber },
  leaveAlertSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  leaveCountBubble: { width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENT.amber, alignItems: 'center', justifyContent: 'center' },
  leaveCountText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // ── Section Label ────────────────────────────────────────────────────────
  sectionLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2, marginRight: 9 },
  sectionLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },

  // ── Attendance Hero Card ─────────────────────────────────────────────────
  heroCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 6 },
  cardTopGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
  cardShimmerLine: { position: 'absolute', top: 0, left: 30, right: 30, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4 },
  heroCardTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  heroCardSub: { fontSize: 11.5, fontWeight: '500', marginTop: 2 },
  heroCardChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  heroCardChipText: { fontSize: 11, fontWeight: '700' },
  heroCardBody: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 16 },
  heroCardFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroCardFooterText: { fontSize: 12, fontWeight: '600' },
  heroCardFooterLink: { fontSize: 12, fontWeight: '700', letterSpacing: -0.2 },

  // ── Arc ──────────────────────────────────────────────────────────────────
  arcContainer: { width: 164, height: 164, alignItems: 'center', justifyContent: 'center' },
  arcCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  arcPct: { fontSize: 38, fontWeight: '900', letterSpacing: -2 },
  arcPctSymbol: { fontSize: 18, fontWeight: '700' },
  arcLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 2 },

  // ── Stat Pill ────────────────────────────────────────────────────────────
  heroStatCol: { flex: 1, gap: 10 },
  statPill: { borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  statPillVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statPillLbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, marginTop: 2 },

  // ── Menu Grid ────────────────────────────────────────────────────────────
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MENU_GAP, marginBottom: 4 },
});
