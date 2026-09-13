import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { staffAttendanceV2Client, TodayAttendanceStatus } from '../services/staffAttendanceV2Client';
import * as Haptics from '../utils/haptics';

interface Props {
  isDark: boolean;
}

export default function StaffAttendanceQuickCard({ isDark }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadStatus = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await staffAttendanceV2Client.getTodayStatus();
      setStatus(res);
    } catch (err: any) {
      console.warn('Failed to load today staff attendance status:', err);
      setError('Unable to fetch live status');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus(true);
    }, [loadStatus])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadStatus(true);
      }
    });
    return () => subscription.remove();
  }, [loadStatus]);

  const handlePressCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/staff/attendance' as any);
  };

  const handleActionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!status) {
      router.push('/staff/attendance' as any);
      return;
    }
    if (status.device_registration_status !== 'approved') {
      router.push('/staff/attendance' as any);
      return;
    }
    if (status.can_check_in) {
      router.push({ pathname: '/staff/attendance' as any, params: { autoAction: 'check_in' } });
    } else if (status.can_check_out) {
      router.push({ pathname: '/staff/attendance' as any, params: { autoAction: 'check_out' } });
    } else {
      router.push('/staff/attendance' as any);
    }
  };

  const cardBg = isDark ? '#141829' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  const formatTime = (ts?: string | null) => {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return null;
    }
  };

  const checkInTimeStr = formatTime(status?.check_in_at);
  const checkOutTimeStr = formatTime(status?.check_out_at);

  const getStatusBadge = () => {
    if (status?.enforcement_mode === 'disabled') {
      return {
        label: 'Not Enabled',
        color: '#64748B',
        bg: isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9',
        icon: 'pause-circle-outline',
      };
    }
    if (status?.device_registration_status === 'none') {
      return {
        label: 'Device Unregistered',
        color: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        icon: 'phone-portrait-outline',
      };
    }
    if (status?.device_registration_status === 'pending') {
      return {
        label: 'Approval Pending',
        color: '#3B82F6',
        bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
        icon: 'time-outline',
      };
    }
    if (['invalidated', 'rejected', 'revoked', 'replaced'].includes(status?.device_registration_status || '')) {
      return {
        label: 'Biometrics Changed',
        color: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        icon: 'finger-print-outline',
      };
    }
    if (status?.is_finalized) {
      return {
        label: `Final: ${status.daily_status?.toUpperCase() || 'MARKED'}`,
        color: '#10B981',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
        icon: 'shield-checkmark-outline',
      };
    }
    if (status?.verification_source && status.verification_source !== 'mobile_v2' && status.daily_status !== 'not_marked') {
      return {
        label: `Admin: ${status.daily_status.toUpperCase()}`,
        color: '#0F766E',
        bg: isDark ? 'rgba(13, 148, 136, 0.15)' : '#CCFBF1',
        icon: 'person-circle-outline',
      };
    }
    if (status?.check_out_at) {
      return {
        label: 'Day Completed',
        color: '#10B981',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
        icon: 'checkmark-done-circle-outline',
      };
    }
    if (status?.check_in_at) {
      return {
        label: 'Currently Checked In',
        color: '#6366F1',
        bg: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF',
        icon: 'log-in-outline',
      };
    }
    return {
      label: 'Not Checked In',
      color: '#94A3B8',
      bg: isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
      icon: 'ellipse-outline',
    };
  };

  const badge = getStatusBadge();

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.container, animStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePressCard}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
          Platform.OS === 'web'
            ? { boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(100,116,139,0.12)' }
            : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 12, elevation: 4 },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(99, 102, 241, 0.12)', 'rgba(20, 24, 41, 0)']
              : ['rgba(99, 102, 241, 0.06)', 'rgba(255, 255, 255, 0)']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleWithIcon}>
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#2E3558' : '#EEF2FF' }]}>
              <MaterialCommunityIcons name="fingerprint" size={20} color="#6366F1" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Staff Attendance V2</Text>
              <Text style={[styles.cardSubtitle, { color: textSecondary }]}>
                {typeof status?.campus === 'object' && status?.campus?.name
                  ? `${status.campus.name} Campus`
                  : typeof status?.campus === 'string'
                  ? status.campus
                  : 'Biometric Geofence'}
              </Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon as any} size={12} color={badge.color} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Content Body */}
        {loading && !status ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={[styles.loadingText, { color: textSecondary }]}>Verifying status...</Text>
          </View>
        ) : error && !status ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: textSecondary }]}>{error}</Text>
            <TouchableOpacity onPress={() => loadStatus()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bodyRow}>
            <View style={styles.timeSummaryWrap}>
              <View style={styles.timeBlock}>
                <Text style={[styles.timeLabel, { color: textSecondary }]}>IN</Text>
                <Text style={[styles.timeValue, { color: textPrimary }]}>
                  {checkInTimeStr || '—:—'}
                </Text>
              </View>
              <View style={[styles.timeDivider, { backgroundColor: cardBorder }]} />
              <View style={styles.timeBlock}>
                <Text style={[styles.timeLabel, { color: textSecondary }]}>OUT</Text>
                <Text style={[styles.timeValue, { color: textPrimary }]}>
                  {checkOutTimeStr || '—:—'}
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={handleActionPress}
              style={[
                styles.actionBtn,
                status?.can_check_in
                  ? styles.actionBtnIn
                  : status?.can_check_out
                  ? styles.actionBtnOut
                  : styles.actionBtnSecondary,
              ]}
            >
              <Ionicons
                name={
                  status?.can_check_in
                    ? 'log-in'
                    : status?.can_check_out
                    ? 'log-out'
                    : status?.device_registration_status !== 'approved'
                    ? 'shield-outline'
                    : 'calendar-outline'
                }
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.actionBtnText}>
                {status?.can_check_in
                  ? 'Check In'
                  : status?.can_check_out
                  ? 'Check Out'
                  : status?.device_registration_status === 'none'
                  ? 'Register'
                  : status?.device_registration_status === 'pending'
                  ? 'Pending'
                  : 'View'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSummaryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    alignItems: 'flex-start',
    paddingHorizontal: 6,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  timeDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionBtnIn: {
    backgroundColor: '#059669', // Emerald
  },
  actionBtnOut: {
    backgroundColor: '#D97706', // Amber
  },
  actionBtnSecondary: {
    backgroundColor: '#4F46E5', // Indigo
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    marginLeft: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  retryText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
