import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AdminHeader from '../../../src/components/AdminHeader';
import { useTheme } from '../../../src/hooks/useTheme';
import {
  contentService,
  ContentItemDetail,
  ContentVersionItem,
} from '../../../src/services/contentService';
import * as Haptics from '../../../src/utils/haptics';

export default function ContentVersionsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const contentId = params.id;

  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [contentItem, setContentItem] = useState<ContentItemDetail | null>(null);

  const loadItem = useCallback(async () => {
    if (!contentId) return;
    try {
      setLoading(true);
      const data = await contentService.getContentItem(contentId);
      setContentItem(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const handleRestore = (version: ContentVersionItem) => {
    Alert.alert(
      'Restore Version',
      `Restore content to Version ${version.version_number} ("${version.change_summary || 'Snapshot'}")? This will create a new version reflecting this restored state.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'default',
          onPress: async () => {
            try {
              setRestoring(true);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await contentService.restoreVersion(contentId, version.version_number);
              Alert.alert(
                'Restored',
                `Successfully restored to Version ${version.version_number}.`
              );
              await loadItem();
            } catch (err: any) {
              Alert.alert('Restore Failed', err.message || 'An error occurred');
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  const versions = contentItem?.versions || [];

  return (
    <View style={[styles.root, isDark ? styles.rootDark : styles.rootLight]}>
      <AdminHeader title="Version History" showBackButton={true} />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6D28D9" />
          <Text style={styles.loadingText}>Loading version snapshots...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPadding}>
          {/* Item Meta Header */}
          <View style={[styles.headerCard, isDark ? styles.cardDark : styles.cardLight]}>
            <Text style={styles.headerPre}>AUDIT-SAFE VERSION VAULT</Text>
            <Text style={[styles.headerTitle, isDark ? styles.textDark : styles.textLight]}>
              {contentItem?.title}
            </Text>
            <Text style={styles.headerMeta}>
              Type: {contentItem?.type} • Current Status: {contentItem?.status} • Total Versions:{' '}
              {versions.length}
            </Text>
          </View>

          {/* Version Timeline */}
          <View style={styles.timeline}>
            {versions.map((ver: ContentVersionItem, idx: number) => {
              const snapshot = ver.snapshot || {};
              const isCurrent = idx === 0;

              return (
                <View key={ver.id} style={styles.timelineItem}>
                  {/* Timeline Node */}
                  <View style={styles.nodeColumn}>
                    <View style={[styles.nodeDot, isCurrent && styles.activeNodeDot]} />
                    {idx < versions.length - 1 && <View style={styles.nodeLine} />}
                  </View>

                  {/* Version Card */}
                  <View
                    style={[
                      styles.versionCard,
                      isDark ? styles.cardDark : styles.cardLight,
                      isCurrent && styles.activeCardBorder,
                    ]}
                  >
                    <View style={styles.versionHeader}>
                      <View style={styles.versionBadgeRow}>
                        <View
                          style={[
                            styles.versionPill,
                            isCurrent ? styles.activeVersionPill : styles.inactiveVersionPill,
                          ]}
                        >
                          <Text
                            style={[
                              styles.versionPillText,
                              isCurrent ? styles.activeVersionText : styles.inactiveVersionText,
                            ]}
                          >
                            v{ver.version_number}
                          </Text>
                        </View>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>LATEST</Text>
                          </View>
                        )}
                        <Text style={styles.timestamp}>
                          {new Date(ver.created_at).toLocaleString()}
                        </Text>
                      </View>

                      {!isCurrent && (
                        <TouchableOpacity
                          disabled={restoring}
                          onPress={() => handleRestore(ver)}
                          style={styles.restoreBtn}
                        >
                          <Ionicons name="refresh" size={14} color="#6D28D9" />
                          <Text style={styles.restoreBtnText}>Restore</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <Text style={styles.changeSummary}>
                      {ver.change_summary || 'Manual edit'}
                    </Text>

                    {/* Snapshot Preview Box */}
                    <View
                      style={[styles.snapshotBox, isDark ? styles.boxDark : styles.boxLight]}
                    >
                      <Text
                        style={[styles.snapshotTitle, isDark ? styles.textDark : styles.textLight]}
                        numberOfLines={1}
                      >
                        {snapshot.title || snapshot.headline || 'Untitled'}
                      </Text>
                      {snapshot.quote ? (
                        <Text style={styles.snapshotBody} numberOfLines={2}>
                          "{snapshot.quote}" — {snapshot.author || ''}
                        </Text>
                      ) : snapshot.summary ? (
                        <Text style={styles.snapshotBody} numberOfLines={2}>
                          {snapshot.summary}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLight: {
    backgroundColor: '#F8FAFC',
  },
  rootDark: {
    backgroundColor: '#0A0F1D',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 60,
  },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  headerPre: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  headerMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  timeline: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 20,
  },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#CBD5E1',
    marginTop: 6,
  },
  activeNodeDot: {
    backgroundColor: '#6D28D9',
  },
  nodeLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  versionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  cardDark: {
    backgroundColor: '#151D30',
    borderColor: '#1E293B',
  },
  activeCardBorder: {
    borderColor: '#C4B5FD',
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeVersionPill: {
    backgroundColor: '#6D28D9',
  },
  inactiveVersionPill: {
    backgroundColor: '#E2E8F0',
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  activeVersionText: {
    color: '#FFFFFF',
  },
  inactiveVersionText: {
    color: '#475569',
  },
  currentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
  },
  changeSummary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  snapshotBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  boxLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  boxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  snapshotTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  snapshotBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  textLight: {
    color: '#0F172A',
  },
  textDark: {
    color: '#F8FAFC',
  },
});
