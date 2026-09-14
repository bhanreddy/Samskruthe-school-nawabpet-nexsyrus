import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import * as Haptics from '../../utils/haptics';
import { AnecdoteService, TimelineItem } from '../../services/anecdoteService';

interface StudentIntelligenceTimelineProps {
  studentId: string;
  onSelectInsight?: (item: TimelineItem) => void;
  onSelectIntervention?: (item: TimelineItem) => void;
  onRefreshTrigger?: number;
}

const FILTER_TABS = [
  { key: 'ALL', label: 'All Signals', icon: 'layers-outline' },
  { key: 'OBSERVATIONS', label: 'Observations', icon: 'eye-outline' },
  { key: 'ACADEMIC', label: 'Academics', icon: 'book-outline' },
  { key: 'ATTENDANCE', label: 'Attendance', icon: 'calendar-outline' },
  { key: 'INTERVENTION', label: 'Interventions', icon: 'fitness-outline' },
];

export const StudentIntelligenceTimeline: React.FC<StudentIntelligenceTimelineProps> = ({
  studentId,
  onSelectInsight,
  onSelectIntervention,
  onRefreshTrigger = 0,
}) => {
  const { theme, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [studentId, onRefreshTrigger]);

  const loadTimeline = async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await AnecdoteService.getStudentTimeline(studentId, 1, 40);
      setTimelineItems(data?.items || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load student timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeFilter === 'ALL') return timelineItems;
    if (activeFilter === 'OBSERVATIONS') {
      return timelineItems.filter((i) => i.event_type === 'ANECDOTE' || i.event_type === 'OBSERVATION');
    }
    if (activeFilter === 'ACADEMIC') {
      return timelineItems.filter((i) => i.event_type === 'ACADEMIC_SIGNAL' || (i.title && i.title.toLowerCase().includes('academic')));
    }
    if (activeFilter === 'ATTENDANCE') {
      return timelineItems.filter((i) => i.event_type === 'ATTENDANCE_SIGNAL' || (i.title && i.title.toLowerCase().includes('attendance')));
    }
    if (activeFilter === 'INTERVENTION') {
      return timelineItems.filter((i) => i.event_type === 'INTERVENTION' || i.event_type === 'OUTCOME');
    }
    return timelineItems;
  }, [timelineItems, activeFilter]);

  const getEventBadgeMeta = (item: TimelineItem) => {
    switch (item.event_type) {
      case 'ANECDOTE':
      case 'OBSERVATION':
        if (item.sentiment === 'ACHIEVEMENT') return { icon: 'trophy', color: '#EC4899', label: 'Achievement' };
        if (item.sentiment === 'POSITIVE') return { icon: 'star', color: '#10B981', label: 'Growth' };
        if (item.sentiment === 'CONCERN' || item.severity === 'LEVEL_3_ATTENTION' || item.severity === 'LEVEL_4_CRITICAL') {
          return { icon: 'alert-circle', color: '#EF4444', label: 'Attention' };
        }
        if (item.sentiment === 'ATTENTION' || item.severity === 'LEVEL_2_WATCH') {
          return { icon: 'warning', color: '#F59E0B', label: 'Watch' };
        }
        return { icon: 'eye', color: '#6366F1', label: 'Observation' };

      case 'ACADEMIC_SIGNAL':
        return { icon: 'school', color: '#3B82F6', label: 'Exam Signal' };

      case 'ATTENDANCE_SIGNAL':
        return { icon: 'time', color: '#F97316', label: 'Attendance' };

      case 'INTERVENTION':
        return { icon: 'git-network-outline', color: '#8B5CF6', label: 'Intervention' };

      case 'OUTCOME':
        return { icon: 'checkmark-done-circle', color: '#059669', label: 'Outcome' };

      default:
        return { icon: 'sparkles', color: '#6366F1', label: 'Signal' };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'sm');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          Loading student intelligence timeline...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
        <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>Timeline Unavailable</Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>{error}</Text>
        <TouchableOpacity onPress={loadTimeline} style={[styles.retryBtn, { backgroundColor: primaryColor }]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
        {FILTER_TABS.map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveFilter(tab.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.tabPill,
                {
                  backgroundColor: active ? primaryColor : isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: active ? primaryColor : isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569', fontWeight: active ? '700' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline Stream */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="documents-outline" size={42} color={isDark ? '#475569' : '#94A3B8'} />
          <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            No intelligence signals yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Record teacher observations or wait for exam & attendance events to populate this timeline.
          </Text>
        </View>
      ) : (
        <View style={styles.streamList}>
          {filteredItems.map((item, index) => {
            const meta = getEventBadgeMeta(item);
            const isLast = index === filteredItems.length - 1;

            return (
              <View key={item.id || index} style={styles.timelineRow}>
                {/* Left Line & Node */}
                <View style={styles.nodeColumn}>
                  <View style={[styles.circleNode, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon as any} size={12} color="#FFF" />
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.connectorLine,
                        { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                      ]}
                    />
                  )}
                </View>

                {/* Right Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (item.event_type === 'INTERVENTION' && onSelectIntervention) {
                      onSelectIntervention(item);
                    } else if (onSelectInsight) {
                      onSelectInsight(item);
                    }
                  }}
                  style={[cardStyle, styles.timelineCard, { marginBottom: 12 }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={[styles.typeBadge, { backgroundColor: `${meta.color}22` }]}>
                        <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                      </View>
                      {item.category_name ? (
                        <Text style={[styles.categoryText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          • {item.category_name}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.dateText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {formatDate(item.occurred_at || item.created_at)}
                    </Text>
                  </View>

                  {/* Body Title / Summary */}
                  {item.title ? (
                    <Text style={[styles.cardTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                      {item.title}
                    </Text>
                  ) : null}

                  <Text
                    style={[styles.cardDescription, { color: isDark ? '#CBD5E1' : '#334155' }]}
                    numberOfLines={3}
                  >
                    {item.summary || item.description || ''}
                  </Text>

                  {/* Footer Meta / Skills / Context */}
                  <View style={styles.cardFooter}>
                    {item.context ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="location-outline" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text style={[styles.metaChipText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {item.context}
                        </Text>
                      </View>
                    ) : null}

                    {item.skills && Array.isArray(item.skills) && item.skills.length > 0 ? (
                      <View style={styles.skillsRow}>
                        {item.skills.slice(0, 2).map((s: any, idx: number) => (
                          <View
                            key={idx}
                            style={[styles.skillPill, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                          >
                            <Text style={[styles.skillText, { color: primaryColor }]}>#{s}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterScrollContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
  },
  streamList: {
    paddingBottom: 24,
  },
  timelineRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  circleNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  skillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skillPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
