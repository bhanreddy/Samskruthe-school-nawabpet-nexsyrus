import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import { clayTokens } from '../../styles/clayTokens';
import { CalendarEvent, calendarService } from '../../services/calendarService';
import { EVENT_TYPE_CONFIG, formatEventDateRange } from './CalendarTheme';
import { EventDetailModal } from './EventDetailModal';

const BRAND = clayTokens.colors.brand;

interface Props {
  role?: 'admin' | 'staff' | 'student' | 'parent';
  studentId?: string;
  limit?: number;
  calendarRoute?: string;
}

export const UpcomingEventsWidget: React.FC<Props> = ({
  role = 'admin',
  studentId,
  limit = 4,
  calendarRoute,
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const resolvedCalendarRoute =
    calendarRoute ||
    (role === 'admin'
      ? '/admin/calendar'
      : role === 'staff'
      ? '/staff/calendar'
      : '/Screen/calendar');

  const fetchUpcoming = async () => {
    try {
      setLoading(true);
      const data = await calendarService.getUpcomingEvents(limit, studentId);
      setEvents(data);
    } catch {
      // widget fails gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, [studentId, limit]);

  const getCountdownText = (startDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(startDate);
    eventDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    return eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const emptyBody =
    role === 'admin'
      ? 'Publish an event and it will land here first.'
      : 'Nothing scheduled yet — tap View all.';

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.wrap}>
      <View style={styles.container}>
      <View style={styles.inner}>
      <LinearGradient
        colors={isDark ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={16} color={BRAND.violet} />
          </View>
          <View>
            <Text style={styles.headerTitle}>School calendar</Text>
            <Text style={styles.headerSub}>{todayLabel}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          onPress={() => router.push(resolvedCalendarRoute as any)}
          hitSlop={8}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND.violet} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={BRAND.violet} />
          <Text style={styles.loadingText}>Checking the week…</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="leaf-outline" size={16} color={BRAND.violet} />
          <Text style={styles.emptyText} numberOfLines={1}>{emptyBody}</Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {events.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.SCHOOL_EVENT || EVENT_TYPE_CONFIG.GENERAL;
            const countdown = getCountdownText(ev.start_date);
            const isTodayOrTomorrow = countdown === 'Today' || countdown === 'Tomorrow';

            return (
              <Pressable
                key={ev.id}
                style={({ pressed }) => [
                  styles.eventRow,
                  { borderLeftColor: ev.color || cfg.color },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
                ]}
                onPress={() => setSelectedEvent(ev)}
              >
                <View style={styles.eventLeft}>
                  <View
                    style={[
                      styles.countdownPill,
                      isTodayOrTomorrow && styles.countdownActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countdownText,
                        isTodayOrTomorrow && styles.countdownTextActive,
                      ]}
                    >
                      {countdown}
                    </Text>
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {formatEventDateRange(ev.start_date, ev.end_date, ev.all_day, ev.start_time, ev.end_time)}
                      {ev.location ? ` • ${ev.location}` : ''}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: isDark ? cfg.bgDark : cfg.bgLight,
                      borderColor: isDark ? cfg.borderDark : cfg.borderLight,
                    },
                  ]}
                >
                  <Text style={[styles.typeBadgeText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      </View>
      </View>

      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAdmin={role === 'admin'}
        onEventUpdated={fetchUpcoming}
      />
    </Animated.View>
  );
};

function getStyles(theme: any, isDark: boolean) {
  const ink = isDark ? '#F0F2FF' : '#2A3142';
  const muted = isDark ? 'rgba(240,242,255,0.58)' : '#6B7590';

  return StyleSheet.create({
    wrap: {
      marginBottom: 12,
    },
    container: {
      ...clayCard(isDark, 'sm'),
      borderRadius: 20,
    },
    inner: {
      padding: 14,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(108,99,255,0.20)' : BRAND.violetSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: ink,
      letterSpacing: -0.2,
    },
    headerSub: {
      fontSize: 11,
      fontWeight: '500',
      color: muted,
      marginTop: 1,
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minHeight: 32,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(108,99,255,0.16)' : BRAND.violetSoft,
    },
    viewAllText: {
      fontSize: 11,
      fontWeight: '700',
      color: BRAND.violet,
    },
    loadingBox: {
      paddingVertical: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    loadingText: {
      fontSize: 12,
      fontWeight: '500',
      color: muted,
    },
    emptyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 2,
    },
    emptyText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500',
      color: muted,
      lineHeight: 16,
    },
    eventList: {
      gap: 6,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...clayInset(isDark),
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderLeftWidth: 3,
    },
    eventLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    countdownPill: {
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#E7EBF4',
      minWidth: 56,
      alignItems: 'center',
    },
    countdownActive: {
      backgroundColor: isDark ? 'rgba(108,99,255,0.24)' : BRAND.violetSoft,
    },
    countdownText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#475569',
    },
    countdownTextActive: {
      color: BRAND.violet,
      fontWeight: '800',
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: ink,
    },
    eventMeta: {
      fontSize: 11,
      color: muted,
      marginTop: 2,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
  });
}
