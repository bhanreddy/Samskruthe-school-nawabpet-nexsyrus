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
import { useTheme } from '../../../hooks/useTheme';
import { popupApi } from '../popupApi';
import { sanitizeQueuedPopupId } from '../popupActionRegistry';
import type { EligiblePopup } from '../types';

type Filter = 'unread' | 'all';

export default function PopupHistoryScreen({ embedded = false }: { embedded?: boolean }) {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ popupId?: string }>();
  const focusId = sanitizeQueuedPopupId(typeof params.popupId === 'string' ? params.popupId : null);
  const [items, setItems] = useState<EligiblePopup[]>([]);
  const [filter, setFilter] = useState<Filter>('unread');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const rows = await popupApi.inbox(false);
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const list = filter === 'unread' ? items.filter((item) => item.unread) : items;
    if (!focusId) return list;
    return [...list].sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId));
  }, [items, filter, focusId]);

  const styles = useMemo(() => createStyles(isDark, theme.colors), [isDark, theme.colors]);

  return (
    <View style={[styles.screen, embedded && { paddingTop: 0 }]}>
      <View style={styles.filters}>
        {(['unread', 'all'] as Filter[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.chip, filter === key && styles.chipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === key }}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextOn]}>
              {key === 'unread' ? 'Unread' : 'Recent'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={styles.list}
      >
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={28} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No updates right now</Text>
            <Text style={styles.emptyCopy}>Important school messages will appear here if you miss a popup.</Text>
          </View>
        ) : visible.map((item) => (
          <Pressable
            key={item.id}
            onPress={async () => {
              await popupApi.read(item.id).catch(() => {});
              setItems((prev) => prev.map((row) => row.id === item.id ? { ...row, unread: false, inbox_read_at: new Date().toISOString() } : row));
            }}
            style={[styles.card, item.id === focusId && styles.cardFocus]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={styles.cardHead}>
              <Text style={styles.category}>{item.category.replace(/_/g, ' ')}</Text>
              {item.unread ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
            <Text style={styles.meta}>
              {item.acknowledged_at ? 'Acknowledged' : item.dismissed_at ? 'Dismissed' : item.unread ? 'Unread' : 'Read'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {!embedded ? (
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>Close</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(isDark: boolean, colors: { background: string; card: string; textStrong: string; textMuted: string; primary: string; border: string }) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background, paddingTop: 8 },
    filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? '#1E293B' : '#EEF2FF',
    },
    chipOn: { backgroundColor: colors.primary },
    chipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
    chipTextOn: { color: '#FFFFFF' },
    list: { padding: 16, paddingBottom: 40, gap: 12 },
    empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textStrong },
    emptyCopy: { fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardFocus: { borderColor: colors.primary },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    category: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: colors.primary, textTransform: 'uppercase' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    title: { fontSize: 16, fontWeight: '700', color: colors.textStrong, marginBottom: 4 },
    message: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
    meta: { marginTop: 10, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    back: { alignSelf: 'center', padding: 16 },
    backText: { color: colors.primary, fontWeight: '700' },
  });
}
