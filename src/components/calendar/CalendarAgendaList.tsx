import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import { CalendarEvent, CalendarEventType } from '../../services/calendarService';
import { formatAgendaDateLabel, formatEventDateRange } from './CalendarTheme';
import { CalendarEventCard } from './CalendarEventCard';
import { useTranslation } from 'react-i18next';

interface Props {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  selectedEventType?: string;
  onFilterTypeChange?: (type: string) => void;
}

const FILTER_TABS: Array<{
  labelKey: string;
  type: CalendarEventType | 'ALL';
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { labelKey: 'all', type: 'ALL', icon: 'apps-outline' },
  { labelKey: 'holidays', type: 'HOLIDAY', icon: 'sunny-outline' },
  { labelKey: 'exams', type: 'EXAM', icon: 'school-outline' },
  { labelKey: 'fees', type: 'FEE_DUE', icon: 'cash-outline' },
  { labelKey: 'homework', type: 'HOMEWORK', icon: 'book-outline' },
  { labelKey: 'events', type: 'SCHOOL_EVENT', icon: 'sparkles-outline' },
  { labelKey: 'sports', type: 'SPORTS', icon: 'football-outline' },
];

export const CalendarAgendaList: React.FC<Props> = ({
  events,
  onSelectEvent,
  selectedEventType = 'ALL',
  onFilterTypeChange,
}) => {
  const { theme, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('te') ? 'te-IN' : 'en-IN';
  const styles = React.useMemo(() => getStyles(theme, isDark), [theme, isDark]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>(selectedEventType);

  const handleFilterSelect = (type: string) => {
    setActiveFilter(type);
    if (onFilterTypeChange) onFilterTypeChange(type);
  };

  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => {
      if (activeFilter !== 'ALL' && ev.event_type !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        const matchLoc = (ev.location || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }
      return true;
    });
  }, [events, activeFilter, searchQuery]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const sorted = [...filteredEvents].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    for (const ev of sorted) {
      const key = (ev.start_date || '').slice(0, 10);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={18}
          color={isDark ? '#94A3B8' : '#64748B'}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t('studentCalendar.searchPlaceholder')}
          placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={styles.filterRow}
      >
        {FILTER_TABS.map((item) => {
          const isActive = activeFilter === item.type;
          return (
            <TouchableOpacity
              key={item.type}
              style={[styles.filterPill, isActive && styles.activeFilterPill]}
              onPress={() => handleFilterSelect(item.type)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={13} color={isActive ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                {t(`studentCalendar.${item.labelKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={26} color={isDark ? '#A5B4FC' : '#4F46E5'} />
          </View>
          <Text style={styles.emptyTitle}>{t('studentCalendar.noMatching')}</Text>
          <Text style={styles.emptySub}>{t('studentCalendar.tryAnother')}</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {grouped.map(([ymd, dayEvents]) => (
            <View key={ymd} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {(() => {
                    const { relativeKey, dateLabel } = formatAgendaDateLabel(ymd, locale);
                    return relativeKey
                      ? `${t(`studentCalendar.${relativeKey}`)} · ${dateLabel}`
                      : dateLabel;
                  })()}
                </Text>
                <Text style={styles.groupCount}>{dayEvents.length}</Text>
              </View>
              {dayEvents.map((ev) => (
                <CalendarEventCard
                  key={ev.id}
                  event={ev}
                  onPress={() => onSelectEvent(ev)}
                  trailing={formatEventDateRange(
                    ev.start_date,
                    ev.end_date,
                    ev.all_day ?? ev.is_all_day,
                    ev.start_time,
                    ev.end_time,
                    locale,
                  )}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

function getStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    searchRow: {
      ...clayInset(isDark),
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
      borderRadius: 16,
      marginBottom: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.text,
      padding: 0,
    },
    filterRow: {
      marginBottom: 16,
      flexGrow: 0,
    },
    filterContent: {
      gap: 8,
      paddingRight: 8,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minHeight: 38,
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    },
    activeFilterPill: {
      backgroundColor: '#4F46E5',
      borderColor: '#4F46E5',
    },
    filterText: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    activeFilterText: {
      color: '#FFFFFF',
    },
    emptyCard: {
      ...clayCard(isDark, 'sm'),
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
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
    },
    emptySub: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 4,
      textAlign: 'center',
    },
    listContainer: {
      gap: 18,
    },
    group: {
      gap: 10,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#CBD5E1' : '#334155',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    groupCount: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#94A3B8' : '#64748B',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2FF',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      overflow: 'hidden',
    },
  });
}
