import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import StaffHeader from '../../src/components/StaffHeader';
import { useTheme } from '../../src/hooks/useTheme';
import { clayCard, clayInset } from '../../src/theme/clayStyles';
import * as Haptics from '../../src/utils/haptics';
import { alertCompat } from '../../src/utils/crossPlatformAlert';
import { AnecdoteService, Anecdote } from '../../src/services/anecdoteService';
import { AnecdoteOfflineQueue, QueuedAnecdote } from '../../src/services/anecdoteOfflineQueue';
import { AnecdoteQuickModal } from '../../src/components/anecdote/AnecdoteQuickModal';
import { StudentIntelligenceTimeline } from '../../src/components/anecdote/StudentIntelligenceTimeline';
import StudentPhoto from '../../src/components/StudentPhoto';

const { width: WIN_W } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'Academic', label: 'Academic' },
  { key: 'Behaviour', label: 'Behaviour' },
  { key: 'Social & Emotional', label: 'Social & Emotional' },
  { key: 'Achievement', label: 'Achievement' },
  { key: 'Attendance', label: 'Attendance' },
  { key: 'Participation', label: 'Participation' },
];

export default function StaffAnecdotesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  // State
  const [anecdotes, setAnecdotes] = useState<Anecdote[]>([]);
  const [pendingQueue, setPendingQueue] = useState<QueuedAnecdote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [quickModalVisible, setQuickModalVisible] = useState(false);
  const [selectedStudentForTimeline, setSelectedStudentForTimeline] = useState<{ id: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [list, queue] = await Promise.all([
        AnecdoteService.getAnecdotes({ limit: 40 }),
        AnecdoteOfflineQueue.getPendingObservations(),
      ]);
      setAnecdotes(list?.items || []);
      setPendingQueue(queue || []);
    } catch (err) {
      console.warn('Failed to load anecdotes', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleSyncQueue = async () => {
    if (pendingQueue.length === 0) return;
    setIsSyncing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await AnecdoteOfflineQueue.syncPendingObservations();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alertCompat('Sync Complete', `Synchronized ${res.synced} offline observations.`);
      loadData();
    } catch (err: any) {
      alertCompat('Sync Failed', 'Could not sync observations. Will retry automatically.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredAnecdotes = useMemo(() => {
    let res = [...anecdotes];

    if (selectedCategory !== 'ALL') {
      res = res.filter((a) => a.category_name === selectedCategory || a.category_code === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (a) =>
          a.student_name?.toLowerCase().includes(q) ||
          a.student_admission_no?.toLowerCase().includes(q) ||
          a.observation_text?.toLowerCase().includes(q)
      );
    }

    return res;
  }, [anecdotes, selectedCategory, searchQuery]);

  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'md');
  const insetStyle = clayInset(isDark, false);

  const getSeverityPill = (sev?: string) => {
    switch (sev) {
      case 'LEVEL_4_CRITICAL':
        return { label: 'L4 Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
      case 'LEVEL_3_ATTENTION':
        return { label: 'L3 Attention', color: '#EA580C', bg: 'rgba(234,88,12,0.12)' };
      case 'LEVEL_2_WATCH':
        return { label: 'L2 Watch', color: '#D97706', bg: 'rgba(217,119,6,0.12)' };
      case 'LEVEL_1_POSITIVE':
        return { label: 'L1 Positive', color: '#059669', bg: 'rgba(5,150,105,0.12)' };
      default:
        return { label: 'L0 Info', color: '#64748B', bg: 'rgba(100,116,139,0.12)' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#080B14' : '#F1F5F9' }]}>
      <StaffHeader title="Anecdotes & Intelligence" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primaryColor} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline Sync Banner if queue has pending items */}
        {pendingQueue.length > 0 && (
          <View style={[styles.offlineBanner, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
            <View style={styles.offlineBannerLeft}>
              <Ionicons name="cloud-offline-outline" size={20} color="#6366F1" />
              <View>
                <Text style={[styles.offlineBannerTitle, { color: isDark ? '#E0E7FF' : '#312E81' }]}>
                  {pendingQueue.length} Observation{pendingQueue.length > 1 ? 's' : ''} Pending Sync
                </Text>
                <Text style={[styles.offlineBannerSubtitle, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                  Saved safely on this device
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSyncQueue}
              disabled={isSyncing}
              style={[styles.syncBtn, { backgroundColor: primaryColor }]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={14} color="#FFF" />
                  <Text style={styles.syncBtnText}>Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Top Hero & Action Card */}
        <View style={[cardStyle, styles.heroCard]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                Observation Hub
              </Text>
              <Text style={[styles.heroSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Capture student growth, behavior, and achievements in under 20 seconds.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setQuickModalVisible(true);
              }}
              style={styles.newObservationBtn}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newObservationGradient}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.newObservationText}>Record</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Cockpit Nav Link */}
          <TouchableOpacity
            onPress={() => router.push('/staff/student-intelligence' as any)}
            style={[styles.cockpitLink, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
          >
            <View style={styles.cockpitLinkLeft}>
              <Ionicons name="analytics-outline" size={18} color="#10B981" />
              <Text style={[styles.cockpitLinkText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                Open Student Intelligence Cockpit (Stable, Watch, Attention, Strengths)
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={[insetStyle, styles.searchBar]}>
          <Ionicons name="search-outline" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
            placeholder="Search student or observation..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
          {CATEGORIES.map((c) => {
            const active = selectedCategory === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => {
                  setSelectedCategory(c.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: active ? primaryColor : isDark ? '#1E293B' : '#FFF',
                    borderColor: active ? primaryColor : isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: active ? '#FFF' : isDark ? '#CBD5E1' : '#475569', fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Observations Feed */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={[styles.loadingText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Loading observations...
            </Text>
          </View>
        ) : filteredAnecdotes.length === 0 ? (
          <View style={[cardStyle, styles.emptyCard]}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color={isDark ? '#475569' : '#94A3B8'} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              No observations found
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Tap "Record" to write your first observation.
            </Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {filteredAnecdotes.map((item) => {
              const pill = getSeverityPill(item.severity);
              const dateStr = item.observed_at ? new Date(item.observed_at).toLocaleDateString() : '';

              return (
                <View key={item.id} style={[cardStyle, styles.anecdoteCard]}>
                  {/* Top Row: Student info & Severity pill */}
                  <View style={styles.anecdoteHeader}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedStudentForTimeline({
                          id: item.student_id,
                          name: item.student_name || 'Student',
                        });
                      }}
                      style={styles.studentTouch}
                    >
                      <StudentPhoto photoUrl={item.student_photo_url} size={40} />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.studentName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                          {item.student_name || 'Student'}
                        </Text>
                        <Text style={[styles.studentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {item.student_admission_no ? `Adm: ${item.student_admission_no} • ` : ''}
                          {dateStr}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={[styles.severityBadge, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.severityBadgeText, { color: pill.color }]}>{pill.label}</Text>
                    </View>
                  </View>

                  {/* Observation Text */}
                  <Text style={[styles.observationText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                    {item.observation_text}
                  </Text>

                  {/* Badges: Category, Context, Type */}
                  <View style={styles.badgesRow}>
                    {item.category_name && (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                        <Text style={[styles.badgeText, { color: primaryColor }]}>{item.category_name}</Text>
                      </View>
                    )}
                    {item.context && (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Ionicons name="location-outline" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                        <Text style={[styles.badgeText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {item.context}
                        </Text>
                      </View>
                    )}
                    {item.observation_type && (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Text style={[styles.badgeText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {item.observation_type}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions Footer: Timeline, Details */}
                  <View style={[styles.cardFooter, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedStudentForTimeline({
                          id: item.student_id,
                          name: item.student_name || 'Student',
                        });
                      }}
                      style={styles.footerActionBtn}
                    >
                      <Ionicons name="time-outline" size={15} color={primaryColor} />
                      <Text style={[styles.footerActionText, { color: primaryColor }]}>Student Timeline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        router.push({
                          pathname: '/staff/student-intelligence',
                          params: { studentId: item.student_id },
                        } as any);
                      }}
                      style={styles.footerActionBtn}
                    >
                      <Ionicons name="pulse-outline" size={15} color="#10B981" />
                      <Text style={[styles.footerActionText, { color: '#10B981' }]}>Intelligence Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fast Observation Capture Modal */}
      <AnecdoteQuickModal
        visible={quickModalVisible}
        onClose={() => setQuickModalVisible(false)}
        onSuccess={() => loadData()}
      />

      {/* Student Timeline Sheet/Modal */}
      {selectedStudentForTimeline && (
        <View style={styles.timelineOverlay}>
          <View style={[styles.timelineSheet, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <View style={styles.timelineHeader}>
              <View>
                <Text style={[styles.timelineHeaderTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  {selectedStudentForTimeline.name}
                </Text>
                <Text style={[styles.timelineHeaderSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Unified Intelligence Timeline
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStudentForTimeline(null)}
                style={styles.closeTimelineBtn}
              >
                <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <StudentIntelligenceTimeline studentId={selectedStudentForTimeline.id} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  offlineBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  offlineBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  offlineBannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCard: {
    padding: 16,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    paddingRight: 10,
    lineHeight: 16,
  },
  newObservationBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  newObservationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newObservationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cockpitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
  },
  cockpitLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cockpitLinkText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoryChipsScroll: {
    marginBottom: 14,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 32,
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
  },
  feed: {
    gap: 12,
  },
  anecdoteCard: {
    padding: 16,
  },
  anecdoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  observationText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  timelineSheet: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  timelineHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  timelineHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeTimelineBtn: {
    padding: 6,
  },
});
