import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import { CalendarEvent } from '../../services/calendarService';
import * as Haptics from '../../utils/haptics';
import { EVENT_TYPE_CONFIG, parseYmd, toLocalYmd, todayYmd, addDaysYmd } from './CalendarTheme';

interface Props {
  currentDate: Date;
  selectedDate: string;
  events: CalendarEvent[];
  onSelectDate: (date: string) => void;
  onChangeMonth: (deltaMonths: number) => void;
  onGoToday: () => void;
}

const WEEKDAYS = [
  { key: 'sun', full: 'Sun', short: 'S' },
  { key: 'mon', full: 'Mon', short: 'M' },
  { key: 'tue', full: 'Tue', short: 'T' },
  { key: 'wed', full: 'Wed', short: 'W' },
  { key: 'thu', full: 'Thu', short: 'T' },
  { key: 'fri', full: 'Fri', short: 'F' },
  { key: 'sat', full: 'Sat', short: 'S' },
];

const LEGEND = [
  { label: 'Holiday', color: '#DC2626' },
  { label: 'Exam', color: '#4F46E5' },
  { label: 'Fee', color: '#EA580C' },
  { label: 'Event', color: '#64748B' },
];

export const CalendarMonthGrid: React.FC<Props> = ({
  currentDate,
  selectedDate,
  events,
  onSelectDate,
  onChangeMonth,
  onGoToday,
}) => {
  const { theme, isDark } = useTheme();
  const [layoutWidth, setLayoutWidth] = React.useState(0);
  const compact = layoutWidth > 0 ? layoutWidth < 560 : true;
  const styles = React.useMemo(
    () => getStyles(theme, isDark, compact),
    [theme, isDark, compact],
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayStr = todayYmd();

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!ev.start_date) continue;
      const start = ev.start_date.slice(0, 10);
      const end = (ev.end_date || start).slice(0, 10);
      let cursor = start;
      let guard = 0;
      while (cursor <= end && guard < 400) {
        if (!map[cursor]) map[cursor] = [];
        map[cursor].push(ev);
        cursor = addDaysYmd(cursor, 1);
        guard += 1;
      }
    }
    return map;
  }, [events]);

  const monthEvents = React.useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return events.filter((ev) => (ev.start_date || '').startsWith(prefix) || (ev.end_date || '').startsWith(prefix));
  }, [events, year, month]);

  const monthName = currentDate.toLocaleDateString('en-IN', {
    month: compact ? 'short' : 'long',
    year: 'numeric',
  });

  const gridCells: Array<{ dayNum: number; dateStr: string; isCurrentMonth: boolean; isSunday: boolean }> = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, d);
    gridCells.push({
      dayNum: d,
      dateStr: toLocalYmd(dateObj),
      isCurrentMonth: false,
      isSunday: dateObj.getDay() === 0,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    gridCells.push({
      dayNum: d,
      dateStr: toLocalYmd(dateObj),
      isCurrentMonth: true,
      isSunday: dateObj.getDay() === 0,
    });
  }

  const remaining = 7 - (gridCells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      gridCells.push({
        dayNum: d,
        dateStr: toLocalYmd(dateObj),
        isCurrentMonth: false,
        isSunday: dateObj.getDay() === 0,
      });
    }
  }

  const handleSelect = (dateStr: string) => {
    Haptics.selectionAsync();
    onSelectDate(dateStr);
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeMonth(-1);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.monthTitleWrap}>
          <Text style={styles.monthTitle} numberOfLines={1}>
            {monthName}
          </Text>
          <Text style={styles.monthSub} numberOfLines={1}>
            {monthEvents.length === 0
              ? 'No events this month'
              : `${monthEvents.length} event${monthEvents.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChangeMonth(1);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.todayRow}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onGoToday();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Go to today"
        >
          <LinearGradient
            colors={isDark ? ['#4F46E5', '#7C3AED'] : ['#4F46E5', '#6366F1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayButton}
          >
            <Ionicons name="today-outline" size={13} color="#FFFFFF" />
            <Text style={styles.todayButtonText}>Today</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd, idx) => (
          <View key={wd.key} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, idx === 0 && styles.sundayWeekdayText]}>
              {compact ? wd.short : wd.full}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.matrixContainer}>
        {Array.from({ length: Math.ceil(gridCells.length / 7) }).map((_, rowIndex) => {
          const rowCells = gridCells.slice(rowIndex * 7, rowIndex * 7 + 7);
          return (
            <View key={`row-${rowIndex}`} style={styles.row}>
              {rowCells.map((cell) => {
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;
                const dayEvents = eventsByDate[cell.dateStr] || [];
                const hasHoliday = dayEvents.some((e) => e.is_holiday || e.event_type === 'HOLIDAY');
                const hasOverride = dayEvents.some((e) => !!e.timetable_day_override);
                const marks = Array.from(
                  new Set(
                    dayEvents.map(
                      (ev) => ev.color || EVENT_TYPE_CONFIG[ev.event_type]?.color || EVENT_TYPE_CONFIG.GENERAL.color,
                    ),
                  ),
                ).slice(0, 3);

                return (
                  <TouchableOpacity
                    key={cell.dateStr}
                    style={[
                      styles.cell,
                      !cell.isCurrentMonth && styles.dimmedCell,
                      cell.isSunday && !hasHoliday && !isSelected && styles.sundayCell,
                      hasHoliday && !isSelected && styles.holidayCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => handleSelect(cell.dateStr)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={parseYmd(cell.dateStr).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.dayNumberWrapper,
                        isToday && !isSelected && styles.todayWrapper,
                        isSelected && styles.selectedDayWrapper,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.isCurrentMonth && styles.dimmedDayText,
                          cell.isSunday && !isToday && !isSelected && styles.sundayText,
                          hasHoliday && !isToday && !isSelected && styles.holidayDayText,
                          isToday && !isSelected && styles.todayDayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {cell.dayNum}
                      </Text>
                    </View>

                    <View style={styles.marksRow}>
                      {marks.map((color) => (
                        <View key={`${cell.dateStr}-${color}`} style={[styles.mark, { backgroundColor: color }]} />
                      ))}
                      {dayEvents.length > 3 ? <Text style={styles.moreText}>+</Text> : null}
                    </View>

                    {hasOverride ? (
                      <View style={styles.overrideBadge}>
                        <Ionicons name="swap-horizontal" size={8} color="#4F46E5" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        {LEGEND.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

function getStyles(theme: any, isDark: boolean, compact: boolean) {
  return StyleSheet.create({
    container: {
      ...clayCard(isDark, 'sm'),
      padding: compact ? 12 : 18,
      marginBottom: 0,
      borderRadius: 28,
    },
    navHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    monthTitleWrap: {
      flex: 1,
      alignItems: 'center',
    },
    monthTitle: {
      fontSize: compact ? 18 : 22,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.6,
    },
    monthSub: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
      letterSpacing: 0.2,
    },
    todayRow: {
      alignItems: 'center',
      marginTop: 10,
      marginBottom: compact ? 10 : 14,
    },
    todayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      minHeight: 32,
      borderRadius: 999,
      overflow: 'hidden',
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    arrowButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255,255,255,0.95)',
    },
    weekdayRow: {
      flexDirection: 'row',
      paddingBottom: 8,
      marginBottom: 4,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekdayText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    sundayWeekdayText: {
      color: '#EF4444',
    },
    matrixContainer: {
      flexDirection: 'column',
      gap: compact ? 2 : 6,
    },
    row: {
      flexDirection: 'row',
      gap: compact ? 2 : 6,
    },
    cell: {
      flex: 1,
      minHeight: compact ? 46 : 62,
      borderRadius: compact ? 14 : 16,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: compact ? 4 : 6,
      position: 'relative',
    },
    dimmedCell: {
      opacity: 0.32,
    },
    sundayCell: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.06)' : 'rgba(254, 242, 242, 0.7)',
    },
    holidayCell: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
    },
    selectedCell: {
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.22)' : '#EEF2FF',
    },
    dayNumberWrapper: {
      width: compact ? 28 : 30,
      height: compact ? 28 : 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayWrapper: {
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.28)' : 'rgba(79, 70, 229, 0.12)',
    },
    selectedDayWrapper: {
      backgroundColor: '#4F46E5',
    },
    dayText: {
      fontSize: compact ? 13 : 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    dimmedDayText: {
      color: isDark ? '#64748B' : '#94A3B8',
    },
    sundayText: {
      color: '#EF4444',
      fontWeight: '800',
    },
    holidayDayText: {
      color: '#DC2626',
      fontWeight: '800',
    },
    todayDayText: {
      color: '#4F46E5',
      fontWeight: '800',
    },
    selectedDayText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    marksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      marginTop: 3,
      minHeight: 5,
    },
    mark: {
      width: compact ? 6 : 8,
      height: 3,
      borderRadius: 2,
    },
    moreText: {
      fontSize: 8,
      fontWeight: '800',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    overrideBadge: {
      position: 'absolute',
      top: 3,
      right: 3,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.25)' : '#EEF2FF',
      borderRadius: 5,
      padding: 1,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: compact ? 10 : 16,
      marginTop: compact ? 10 : 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendDot: {
      width: 8,
      height: 3,
      borderRadius: 2,
    },
    legendText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
    },
  });
}
