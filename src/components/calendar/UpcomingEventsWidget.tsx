import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import { CalendarEvent, calendarService } from '../../services/calendarService';
import { EVENT_TYPE_CONFIG, formatEventDateRange } from './CalendarTheme';
import { EventDetailModal } from './EventDetailModal';

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

  return (
    <View style={styles.container}>
      {/* Widget Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
          </View>
          <Text style={styles.headerTitle}>Academic Calendar</Text>
        </View>

        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push(resolvedCalendarRoute as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color="#4F46E5" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No upcoming events scheduled</Text>
        </View>
      ) : (
        <View style={styles.eventList}>
          {events.map((ev) => {
            const cfg = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.SCHOOL_EVENT || EVENT_TYPE_CONFIG.GENERAL;
            const countdown = getCountdownText(ev.start_date);
            const isTodayOrTomorrow = countdown === 'Today' || countdown === 'Tomorrow';

            return (
              <TouchableOpacity
                key={ev.id}
                style={[
                  styles.eventRow,
                  { borderLeftColor: ev.color || cfg.color },
                ]}
                onPress={() => setSelectedEvent(ev)}
                activeOpacity={0.75}
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
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isAdmin={role === 'admin'}
        onEventUpdated={fetchUpcoming}
      />
    </View>
  );
};

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      ...clayCard(isDark, 'sm'),
      padding: 16,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    viewAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4F46E5',
    },
    loadingBox: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyBox: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    eventList: {
      gap: 8,
    },
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderLeftWidth: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
    },
    eventLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    countdownPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0',
      minWidth: 54,
      alignItems: 'center',
    },
    countdownActive: {
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.3)' : '#EEF2FF',
    },
    countdownText: {
      fontSize: 11,
      fontWeight: '600',
      color: isDark ? '#CBD5E1' : '#475569',
    },
    countdownTextActive: {
      color: '#4F46E5',
      fontWeight: '700',
    },
    eventInfo: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    eventMeta: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
  });
}
