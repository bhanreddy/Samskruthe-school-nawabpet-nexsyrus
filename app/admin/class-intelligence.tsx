import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import AdminHeader from '../../src/components/AdminHeader';
import { useTheme } from '../../src/hooks/useTheme';
import { clayCard } from '../../src/theme/clayStyles';
import { IntelligenceService } from '../../src/services/intelligenceService';
import StudentPhoto from '../../src/components/StudentPhoto';

export default function AdminClassIntelligenceScreen() {
  const { classSectionId, className } = useLocalSearchParams<{ classSectionId?: string; className?: string }>();
  const { theme, isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payload, setPayload] = useState<any>(null);

  const load = useCallback(async () => {
    if (!classSectionId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await IntelligenceService.getClassIntelligence(String(classSectionId));
      setPayload(data);
    } catch (err) {
      console.warn('Failed to load class intelligence', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [classSectionId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const cardStyle = clayCard(isDark, 'md');
  const primaryColor = theme.colors.primary || '#6366F1';
  const students = payload?.students || [];
  const title = className || payload?.classInfo
    ? `${payload?.classInfo?.class_name || className || 'Class'} ${payload?.classInfo?.section_name || ''}`.trim()
    : 'Class Intelligence';

  const attention = students.filter((s: any) => s.status_tier === 'ATTENTION').length;
  const watch = students.filter((s: any) => s.status_tier === 'WATCH').length;
  const growth = students.filter((s: any) => s.status_tier === 'GROWTH').length;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#080B14' : '#F1F5F9' }]}>
      <AdminHeader title={title} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              load();
            }}
            tintColor={primaryColor}
          />
        }
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={[cardStyle, styles.statCard]}>
                <Text style={[styles.statNum, { color: '#EF4444' }]}>{attention}</Text>
                <Text style={styles.statLabel}>Attention</Text>
              </View>
              <View style={[cardStyle, styles.statCard]}>
                <Text style={[styles.statNum, { color: '#F59E0B' }]}>{watch}</Text>
                <Text style={styles.statLabel}>Watch</Text>
              </View>
              <View style={[cardStyle, styles.statCard]}>
                <Text style={[styles.statNum, { color: '#10B981' }]}>{growth}</Text>
                <Text style={styles.statLabel}>Growth</Text>
              </View>
            </View>

            {students.map((student: any) => (
              <View key={student.id} style={[cardStyle, styles.studentCard]}>
                <StudentPhoto photoUrl={student.photo_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {student.display_name}
                  </Text>
                  <Text style={[styles.studentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {student.status_tier || 'STABLE'}
                    {student.attendance_rate_30d != null ? ` • Attendance ${student.attendance_rate_30d}%` : ''}
                    {student.assessment_avg_recent != null ? ` • Assessments ${student.assessment_avg_recent}%` : ''}
                  </Text>
                </View>
                <Ionicons
                  name={student.status_tier === 'ATTENTION' ? 'alert-circle' : student.status_tier === 'GROWTH' ? 'star' : 'checkmark-circle'}
                  size={18}
                  color={student.status_tier === 'ATTENTION' ? '#EF4444' : student.status_tier === 'GROWTH' ? '#10B981' : '#059669'}
                />
              </View>
            ))}

            {students.length === 0 ? (
              <Text style={[styles.empty, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                No students found for this class section.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  center: { paddingTop: 80, alignItems: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 14, borderRadius: 18, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  studentCard: { padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  studentName: { fontSize: 15, fontWeight: '700' },
  studentMeta: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 24 },
});
