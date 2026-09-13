import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import { CalendarEvent, SchoolDayStatus } from '../../services/calendarService';
import { formatDayParts } from './CalendarTheme';
import { CalendarEventCard } from './CalendarEventCard';

interface Props {
  selectedDate: string;
  dayStatus: SchoolDayStatus | null;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEventForDay?: (date: string) => void;
  isAdmin?: boolean;
}

export const CalendarDayView: React.FC<Props> = ({
  selectedDate,
  dayStatus,
  events,
  onSelectEvent,
  onAddEventForDay,
  isAdmin = false,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const styles = React.useMemo(() => getStyles(theme, isDark, compact), [theme, isDark, compact]);
  const parts = formatDayParts(selectedDate);

  const isHoliday = !!dayStatus?.isHoliday;
  const isSpecial = !!dayStatus?.isSpecialWorkingDay;
  const heroColors: [string, string] = isHoliday
    ? isDark
      ? ['#7F1D1D', '#9F1239']
      : ['#DC2626', '#E11D48']
    : isSpecial
      ? isDark
        ? ['#312E81', '#4F46E5']
        : ['#4F46E5', '#7C3AED']
      : isDark
        ? ['#1E1B4B', '#312E81']
        : ['#4F46E5', '#6366F1'];

  const statusLabel = isHoliday
    ? dayStatus?.holidayName || 'School Closed'
    : isSpecial
      ? 'Special Working Day'
      : 'Working Day';

  const statusIcon = isHoliday ? 'sunny' : isSpecial ? 'swap-horizontal' : 'briefcase-outline';

  return (
    <View style={styles.container}>
      <LinearGradient colors={heroColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroBlob} />
        <View style={styles.heroTop}>
          <View>
            {parts.relative ? <Text style={styles.heroEyebrow}>{parts.relative.toUpperCase()}</Text> : null}
            <Text style={styles.heroWeekday}>{parts.weekday}</Text>
            <Text style={styles.heroMonth}>{parts.monthYear}</Text>
          </View>
          <View style={[styles.heroNumeralWrap, compact && styles.heroNumeralWrapCompact]}>
            <Text style={[styles.heroNumeral, compact && styles.heroNumeralCompact]}>{parts.numeral}</Text>
          </View>
        </View>

        {dayStatus ? (
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Ionicons name={statusIcon as any} size={12} color="#FFFFFF" />
              <Text style={styles.heroChipText} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
            <View style={[styles.heroChip, dayStatus.attendanceAllowed ? styles.heroChipOk : styles.heroChipWarn]}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: dayStatus.attendanceAllowed ? '#86EFAC' : '#FECACA' },
                ]}
              />
              <Text style={styles.heroChipText}>
                {dayStatus.attendanceAllowed ? 'Attendance open' : 'Attendance closed'}
              </Text>
            </View>
          </View>
        ) : null}

        {dayStatus ? (
          <Text style={styles.heroHint} numberOfLines={2}>
            {dayStatus.timetableOverride
              ? `Timetable follows ${dayStatus.timetableDay} schedule`
              : `Standard ${dayStatus.timetableDay} classes`}
          </Text>
        ) : null}
      </LinearGradient>

      <View style={styles.eventsHeader}>
        <Text style={styles.sectionHeading}>
          {events.length === 0 ? 'Schedule' : `${events.length} event${events.length === 1 ? '' : 's'}`}
        </Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={isHoliday ? 'cafe-outline' : 'calendar-outline'}
              size={26}
              color={isDark ? '#A5B4FC' : '#4F46E5'}
            />
          </View>
          <Text style={styles.emptyTitle}>{isHoliday ? 'School is closed' : 'Nothing extra scheduled'}</Text>
          <Text style={styles.emptySub}>
            {isHoliday
              ? 'Enjoy the break — classes resume on the next working day.'
              : 'Regular classes follow the timetable for this day.'}
          </Text>
          {isAdmin && onAddEventForDay ? (
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => onAddEventForDay(selectedDate)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Schedule for this day</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.eventList}>
          {events.map((ev) => (
            <CalendarEventCard key={ev.id} event={ev} onPress={() => onSelectEvent(ev)} />
          ))}
        </View>
      )}
    </View>
  );
};

function getStyles(theme: any, isDark: boolean, compact: boolean) {
  return StyleSheet.create({
    container: {
      marginBottom: 8,
    },
    hero: {
      borderRadius: compact ? 24 : 28,
      padding: compact ? 16 : 18,
      overflow: 'hidden',
      marginBottom: compact ? 14 : 16,
    },
    heroBlob: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255,255,255,0.12)',
      top: -56,
      right: -24,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.6,
      color: 'rgba(255,255,255,0.72)',
      marginBottom: 4,
    },
    heroWeekday: {
      fontSize: compact ? 20 : 22,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.4,
    },
    heroMonth: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.78)',
      marginTop: 2,
    },
    heroNumeralWrap: {
      minWidth: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    heroNumeralWrapCompact: {
      minWidth: 60,
      height: 60,
      borderRadius: 20,
    },
    heroNumeral: {
      fontSize: 40,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -1.4,
      lineHeight: 44,
    },
    heroNumeralCompact: {
      fontSize: 32,
      lineHeight: 36,
    },
    heroChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.16)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      maxWidth: '100%',
    },
    heroChipOk: {
      backgroundColor: 'rgba(16, 185, 129, 0.28)',
    },
    heroChipWarn: {
      backgroundColor: 'rgba(248, 113, 113, 0.28)',
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    heroChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    heroHint: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.78)',
      marginTop: 10,
    },
    eventsHeader: {
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    sectionHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#CBD5E1' : '#475569',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    eventList: {
      gap: 10,
    },
    emptyCard: {
      ...clayCard(isDark, 'sm'),
      paddingVertical: 28,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 24,
    },
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text,
      marginTop: 12,
      letterSpacing: -0.2,
    },
    emptySub: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 16,
      backgroundColor: '#4F46E5',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
    },
    emptyCtaText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
