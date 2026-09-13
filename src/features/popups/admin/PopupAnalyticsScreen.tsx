import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../hooks/useTheme';
import { popupApi } from '../popupApi';

export default function PopupAnalyticsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    popupApi.analytics(id).then(setData).catch((err: any) => setError(err?.message || 'Could not load analytics'));
  }, [id]);

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
    title: { fontSize: 22, fontWeight: '700', color: theme.colors.textStrong, marginBottom: 16 },
    card: { backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    value: { color: theme.colors.textStrong, fontSize: 24, fontWeight: '700', marginTop: 4 },
  }), [theme]);

  if (!data && !error) return <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />;
  if (error) return <Text style={{ padding: 24, color: theme.colors.textMuted }}>{error}</Text>;

  const metrics = [
    ['Targeted users', data.targeted_users],
    ['Unique views', data.unique_views],
    ['Total views', data.total_views],
    ['Clicks', data.clicks],
    ['Click-through rate', `${Math.round((data.click_through_rate || 0) * 100)}%`],
    ['Dismissals', data.dismissals],
    ['Acknowledgements', data.acknowledgements],
    ['Pending acknowledgements', data.pending_acknowledgements],
    ['Completions', data.completions],
  ];

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>{data.popup?.title || 'Popup analytics'}</Text>
      {metrics.map(([label, value]) => (
        <View key={String(label)} style={styles.card}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value ?? 0}</Text>
        </View>
      ))}
      {(data.by_role || []).map((row: any) => (
        <View key={row.role_code} style={styles.card}>
          <Text style={styles.label}>{row.role_code}</Text>
          <Text style={styles.value}>{row.views} views</Text>
        </View>
      ))}
    </ScrollView>
  );
}
