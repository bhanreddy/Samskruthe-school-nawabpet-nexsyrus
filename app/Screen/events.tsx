import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/useTheme';
import { eventService, type EventItem } from '@/src/services/eventService';
import { useAuth } from '@/src/hooks/useAuth';

export default function ParentEventsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { student } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await eventService.listEligibleEvents();
      setEvents(res.data || []);
    } catch {
      const fallback = await eventService.listEvents({ status: 'UPCOMING' }).catch(() => ({ data: [] as EventItem[] }));
      setEvents(fallback.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F9FAFB' : '#0F172A';
  const subCol = isDark ? '#9CA3AF' : '#64748B';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textCol }]}>School Events</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          {events.length === 0 ? (
            <Text style={[styles.empty, { color: subCol }]}>No published events right now.</Text>
          ) : (
            events.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                style={[styles.card, { backgroundColor: cardBg }]}
                onPress={() =>
                  router.push({
                    pathname: '/Screen/eventDetails',
                    params: { id: ev.id, studentId: student?.id || '' },
                  } as any)
                }
              >
                <Text style={[styles.cardTitle, { color: textCol }]}>{ev.title}</Text>
                <Text style={[styles.cardMeta, { color: subCol }]}>
                  {ev.start_date} • {ev.location || 'Campus'} • {ev.status}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  empty: { textAlign: 'center', marginTop: 48 },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMeta: { marginTop: 6, fontSize: 13 },
});
