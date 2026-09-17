import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../../hooks/useTheme';
import { clayCard } from '../../../theme/clayStyles';
import { schoolColorWithAlpha } from '../../../constants/schoolConfig';
import * as Haptics from '../../../utils/haptics';
import { popupApi } from '../popupApi';
import { sanitizeQueuedPopupId } from '../popupActionRegistry';
import type { EligiblePopup, PopupCategory, PopupPriority } from '../types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Filter = 'unread' | 'all';

const CATEGORY_META: Record<
  PopupCategory,
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  INFORMATION: { icon: 'information-circle', color: '#4F46E5', label: 'Info' },
  WARNING: { icon: 'warning', color: '#D97706', label: 'Warning' },
  IMPORTANT: { icon: 'alert-circle', color: '#DC2626', label: 'Important' },
  EMERGENCY: { icon: 'flash', color: '#B91C1C', label: 'Emergency' },
  FEATURE_UPDATE: { icon: 'sparkles', color: '#7C3AED', label: 'Feature' },
  APP_UPDATE: { icon: 'cloud-download', color: '#2563EB', label: 'App update' },
  PAYMENT: { icon: 'wallet', color: '#059669', label: 'Fees' },
  ATTENDANCE: { icon: 'calendar', color: '#0EA5E9', label: 'Attendance' },
  EXAM: { icon: 'school', color: '#4F46E5', label: 'Exam' },
  TRANSPORT: { icon: 'bus', color: '#EA580C', label: 'Transport' },
  DOCUMENT: { icon: 'document-text', color: '#64748B', label: 'Document' },
  MAINTENANCE: { icon: 'construct', color: '#78716C', label: 'Maintenance' },
  CUSTOM: { icon: 'megaphone', color: '#7C3AED', label: 'Update' },
};

function categoryMeta(category?: string) {
  return CATEGORY_META[(category || 'CUSTOM') as PopupCategory] || CATEGORY_META.CUSTOM;
}

function relativeTime(iso: string | null | undefined, t: TFunction): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return t('studentUpdates.justNow');
  if (minutes < 60) return t('studentUpdates.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('studentUpdates.hoursAgo', { count: hours });
  const days = Math.round(hours / 24);
  if (days === 1) return t('studentUpdates.yesterday');
  if (days < 7) return t('studentUpdates.daysAgo', { count: days });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function statusLabel(item: EligiblePopup, t: TFunction): string {
  if (item.acknowledged_at) return t('studentUpdates.acknowledged');
  if (item.dismissed_at) return t('studentUpdates.dismissed');
  if (item.unread) return t('studentUpdates.unread');
  return t('studentUpdates.read');
}

function priorityTint(priority?: PopupPriority) {
  if (priority === 'CRITICAL') return '#DC2626';
  if (priority === 'HIGH') return '#EA580C';
  return null;
}

export default function PopupHistoryScreen({ embedded = false }: { embedded?: boolean }) {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ popupId?: string }>();
  const focusId = sanitizeQueuedPopupId(typeof params.popupId === 'string' ? params.popupId : null);
  const [items, setItems] = useState<EligiblePopup[]>([]);
  const [filter, setFilter] = useState<Filter>('unread');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const rows = await popupApi.inbox(false);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const visible = useMemo(() => {
    const list = filter === 'unread' ? items.filter((item) => item.unread) : items;
    if (!focusId) return list;
    return [...list].sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
  }, [items, filter, focusId]);

  const styles = useMemo(() => createStyles(isDark, theme.colors), [isDark, theme.colors]);

  const markRead = useCallback(async (item: EligiblePopup) => {
    Haptics.selectionAsync();
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    if (!item.unread) return;
    await popupApi.read(item.id).catch(() => {});
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, unread: false, inbox_read_at: new Date().toISOString() }
          : row,
      ),
    );
  }, []);

  return (
    <View style={[styles.screen, embedded && { paddingTop: 0 }]}>
      <View style={styles.filters}>
        {([
          { key: 'unread' as Filter, label: t('studentUpdates.unread'), count: unreadCount },
          { key: 'all' as Filter, label: t('studentUpdates.recent'), count: items.length },
        ]).map((tab) => {
          const on = filter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(tab.key);
              }}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{tab.label}</Text>
              <View style={[styles.count, on && styles.countOn]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>{tab.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {!ready ? (
          <View style={styles.empty}>
            <Text style={styles.emptyCopy}>{t('studentUpdates.checking')}</Text>
          </View>
        ) : visible.length === 0 ? (
          <Animated.View entering={FadeIn.duration(280)} style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={filter === 'unread' ? 'sparkles-outline' : 'notifications-off-outline'}
                size={30}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? t('studentUpdates.caughtUp') : t('studentUpdates.noneYet')}
            </Text>
            <Text style={styles.emptyCopy}>
              {filter === 'unread' ? t('studentUpdates.caughtUpCopy') : t('studentUpdates.noneCopy')}
            </Text>
            {filter === 'unread' && items.length > 0 ? (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter('all');
                }}
                style={styles.emptyAction}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionText}>{t('studentUpdates.viewRecent')}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </Animated.View>
        ) : (
          visible.map((item, index) => {
            const meta = categoryMeta(item.category);
            const expanded = expandedId === item.id || item.id === focusId;
            const urgent = priorityTint(item.priority);
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
                <Pressable
                  onPress={() => markRead(item)}
                  style={[styles.card, item.id === focusId && styles.cardFocus]}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={[styles.accent, { backgroundColor: urgent || meta.color }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHead}>
                      <View
                        style={[
                          styles.iconWell,
                          { backgroundColor: schoolColorWithAlpha(meta.color, isDark ? 0.22 : 0.12) },
                        ]}
                      >
                        <Ionicons name={meta.icon} size={16} color={meta.color} />
                      </View>
                      <View style={styles.headCopy}>
                        <Text style={[styles.category, { color: meta.color }]}>
                          {t(`studentUpdates.category.${item.category}`, meta.label)}
                        </Text>
                        <Text style={styles.when}>{relativeTime(item.start_at, t) || statusLabel(item, t)}</Text>
                      </View>
                      {item.unread ? (
                        <View style={styles.unreadPill}>
                          <View style={styles.dot} />
                          <Text style={styles.unreadText}>{t('studentUpdates.new')}</Text>
                        </View>
                      ) : (
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.colors.textMuted}
                        />
                      )}
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message} numberOfLines={expanded ? 12 : 3}>
                      {item.message}
                    </Text>
                    <Text style={styles.meta}>{statusLabel(item, t)}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
      {!embedded ? (
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>{t('studentUpdates.close')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(
  isDark: boolean,
  colors: {
    background: string;
    card: string;
    textStrong: string;
    textMuted: string;
    primary: string;
    border: string;
  },
) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingTop: 8 },
    filters: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 4,
      gap: 4,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)',
      width: '92%',
      maxWidth: 560,
      alignSelf: 'center',
    },
    chip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
      paddingHorizontal: 10,
      borderRadius: 12,
      gap: 8,
    },
    chipOn: {
      backgroundColor: isDark ? schoolColorWithAlpha(colors.primary, 0.35) : '#FFFFFF',
    },
    chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
    chipTextOn: { color: isDark ? '#F8FAFC' : colors.textStrong },
    count: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
    },
    countOn: { backgroundColor: colors.primary },
    countText: { fontSize: 11, fontWeight: '800', color: isDark ? '#E2E8F0' : '#334155' },
    countTextOn: { color: '#FFFFFF' },
    list: { padding: 16, paddingBottom: 48, gap: 12, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 48,
      paddingHorizontal: 28,
      gap: 8,
      flexGrow: 1,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      backgroundColor: schoolColorWithAlpha(colors.primary, isDark ? 0.18 : 0.1),
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.textStrong, letterSpacing: -0.3, textAlign: 'center' },
    emptyCopy: { fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
    emptyAction: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
    },
    emptyActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
    card: {
      ...clayCard(isDark, 'sm'),
      flexDirection: 'row',
      overflow: 'hidden',
      borderRadius: 20,
      paddingLeft: 0,
    },
    cardFocus: { borderColor: colors.primary },
    accent: { width: 5 },
    cardBody: { flex: 1, padding: 14, paddingLeft: 12 },
    cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    iconWell: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headCopy: { flex: 1, minWidth: 0 },
    category: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    when: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginTop: 1 },
    unreadPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    unreadText: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
    title: { fontSize: 16, fontWeight: '800', color: colors.textStrong, marginBottom: 4, letterSpacing: -0.2 },
    message: { fontSize: 14, lineHeight: 21, color: colors.textMuted },
    meta: { marginTop: 10, fontSize: 12, color: colors.textMuted, fontWeight: '700' },
    back: { alignSelf: 'center', padding: 16 },
    backText: { color: colors.primary, fontWeight: '700' },
  });
}
