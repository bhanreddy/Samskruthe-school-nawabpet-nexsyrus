import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { alertCompat } from '../../../utils/crossPlatformAlert';
import { popupApi } from '../popupApi';
import type { AdminPopup } from '../types';

const TABS = ['ACTIVE', 'SCHEDULED', 'DRAFT', 'PAUSED', 'EXPIRED', 'ARCHIVED'] as const;

export default function PopupManagerScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number] | 'ALL'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<AdminPopup[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [list, overview] = await Promise.all([
        popupApi.listAdmin({ status: tab === 'ALL' ? 'all' : tab, search }),
        popupApi.overview(),
      ]);
      setItems(list.items || []);
      setCounts(overview.counts || {});
    } catch (error: any) {
      alertCompat('Could not load popups', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search]);

  useEffect(() => { void load(); }, [load]);

  const styles = useMemo(() => createStyles(isDark, theme.colors), [isDark, theme.colors]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load(true);
    } catch (error: any) {
      alertCompat(label, error?.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search popups"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.search}
        />
        <Pressable onPress={() => router.push('/admin/popup-editor' as any)} style={styles.create} accessibilityRole="button">
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.createText}>Create</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['ALL', ...TABS] as const).map((key) => (
          <Pressable key={key} onPress={() => setTab(key as any)} style={[styles.tab, tab === key && styles.tabOn]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
              {key[0] + key.slice(1).toLowerCase()}{counts[key] != null ? ` ${counts[key]}` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={styles.list}
        >
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.kicker}>{item.category} · {item.priority}</Text>
                <Text style={styles.status}>{item.effective_status || item.status}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {(item.targeting?.everyone ? 'Everyone' : (item.targeting?.roles || []).join(', ') || 'No audience')}
                {' · '}
                {item.start_at ? new Date(item.start_at).toLocaleString() : ''}
              </Text>
              <Text style={styles.stats}>
                Views {item.views || 0} · Clicks {item.clicks || 0} · Ack {item.acknowledgements || 0}
              </Text>
              <View style={styles.actions}>
                <Action label="Edit" onPress={() => router.push(`/admin/popup-editor?id=${item.id}` as any)} />
                <Action label="Preview" onPress={() => router.push(`/admin/popup-editor?id=${item.id}&preview=1` as any)} />
                <Action label="Analytics" onPress={() => router.push(`/admin/popup-analytics?id=${item.id}` as any)} />
                <Action label="Duplicate" onPress={() => run('Duplicate failed', () => popupApi.duplicate(item.id))} />
                {(item.effective_status === 'DRAFT' || item.effective_status === 'SCHEDULED' || item.effective_status === 'PAUSED') && (
                  <Action label={item.effective_status === 'PAUSED' ? 'Resume' : 'Publish'} onPress={() => run('Update failed', () => item.effective_status === 'PAUSED' ? popupApi.resume(item.id) : popupApi.publish(item.id))} />
                )}
                {item.effective_status === 'ACTIVE' && (
                  <Action label="Pause" onPress={() => run('Pause failed', () => popupApi.pause(item.id))} />
                )}
                <Action label="Test" onPress={() => run('Test send failed', () => popupApi.testSend(item.id))} />
                <Action label="Delete" danger onPress={() => run('Delete failed', () => popupApi.remove(item.id))} />
              </View>
            </View>
          ))}
          {!items.length ? <Text style={styles.empty}>No popups in this view yet.</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}

function Action({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 6, paddingRight: 12 }}>
      <Text style={{ fontWeight: '700', fontSize: 13, color: danger ? '#DC2626' : '#4F46E5' }}>{label}</Text>
    </Pressable>
  );
}

function createStyles(isDark: boolean, colors: any) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
    search: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      color: colors.textStrong,
      borderWidth: 1,
      borderColor: colors.border,
    },
    create: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    createText: { color: '#FFF', fontWeight: '700' },
    tabs: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
    tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: isDark ? '#1E293B' : '#EEF2FF' },
    tabOn: { backgroundColor: colors.primary },
    tabText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
    tabTextOn: { color: '#FFF' },
    list: { padding: 16, gap: 12, paddingBottom: 40 },
    card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    kicker: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
    status: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    title: { fontSize: 17, fontWeight: '700', color: colors.textStrong },
    meta: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
    stats: { marginTop: 8, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  });
}
