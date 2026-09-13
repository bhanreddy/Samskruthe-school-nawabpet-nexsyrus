import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import { CalendarEvent } from '../../services/calendarService';
import {
  getEventTypeConfig,
  PRIORITY_CONFIG,
  formatEventTime,
  formatAudience,
} from './CalendarTheme';

interface Props {
  event: CalendarEvent;
  onPress: () => void;
  trailing?: string;
}

export const CalendarEventCard: React.FC<Props> = ({ event, onPress, trailing }) => {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const typeConfig = getEventTypeConfig(event.event_type);
  const accent = event.color || typeConfig.color;
  const cancelled = event.status === 'CANCELLED';
  const timeText =
    trailing ||
    formatEventTime(event.all_day ?? event.is_all_day ?? true, event.start_time, event.end_time);
  const priority = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.MEDIUM;
  const showPriority = event.priority && event.priority !== 'MEDIUM' && event.priority !== 'NORMAL';

  return (
    <TouchableOpacity
      style={[styles.card, cancelled && styles.cancelledCard]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${typeConfig.label}, ${timeText}`}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isDark ? typeConfig.bgDark : typeConfig.bgLight },
        ]}
      >
        <Ionicons name={typeConfig.icon as any} size={16} color={accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, cancelled && styles.cancelledText]} numberOfLines={2}>
            {event.title}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {timeText}
          {event.location ? `  ·  ${event.location}` : `  ·  ${formatAudience(event.target_type)}`}
        </Text>
        <View style={styles.chipRow}>
          <View
            style={[
              styles.typeChip,
              {
                backgroundColor: isDark ? typeConfig.bgDark : typeConfig.bgLight,
                borderColor: isDark ? typeConfig.borderDark : typeConfig.borderLight,
              },
            ]}
          >
            <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {showPriority ? (
            <View style={[styles.priorityChip, { backgroundColor: priority.badge }]}>
              <Text style={[styles.priorityChipText, { color: priority.color }]}>{priority.label}</Text>
            </View>
          ) : null}
          {event.timetable_day_override ? (
            <View style={styles.overrideChip}>
              <Ionicons name="swap-horizontal" size={11} color="#4F46E5" />
              <Text style={styles.overrideChipText}>{event.timetable_day_override}</Text>
            </View>
          ) : null}
          {cancelled ? (
            <View style={styles.cancelledChip}>
              <Text style={styles.cancelledChipText}>Cancelled</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    card: {
      ...clayCard(isDark, 'sm'),
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingVertical: 12,
      paddingRight: 12,
      paddingLeft: 0,
      borderRadius: 20,
    },
    cancelledCard: {
      opacity: 0.62,
    },
    accent: {
      width: 5,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
      marginRight: 12,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    body: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    title: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
      color: theme.colors.text,
      lineHeight: 20,
    },
    cancelledText: {
      textDecorationLine: 'line-through',
    },
    meta: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 3,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    typeChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    typeChipText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    priorityChip: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    priorityChipText: {
      fontSize: 10,
      fontWeight: '800',
    },
    overrideChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    overrideChipText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#4F46E5',
    },
    cancelledChip: {
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.18)' : '#FEF2F2',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
    },
    cancelledChipText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#DC2626',
    },
  });
}
