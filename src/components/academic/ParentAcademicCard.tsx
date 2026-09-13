import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AcademicPlannerService, ParentAcademicSummary } from '../../services/academicPlannerService';

export function ParentAcademicCard({ studentId }: { studentId?: string }) {
  const [data, setData] = useState<ParentAcademicSummary | null>(null);

  useEffect(() => {
    AcademicPlannerService.getParentSummary(studentId)
      .then(setData)
      .catch(() => setData(null));
  }, [studentId]);

  if (!data?.subjects?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Currently learning</Text>
      {data.subjects.slice(0, 4).map((s) => (
        <View key={s.subject_id} style={styles.card}>
          <Text style={styles.subject}>{s.subject_name}</Text>
          <Text style={styles.row}>Currently learning  {s.currently_learning}</Text>
          <Text style={styles.row}>Recently completed  {s.recently_completed}</Text>
          <Text style={styles.row}>Coming next  {s.coming_next}</Text>
          <Text style={styles.progress}>Term progress  {s.term_progress}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  heading: { fontWeight: '800', fontSize: 15, color: '#0F172A' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  subject: { fontWeight: '800', fontSize: 16, marginBottom: 6 },
  row: { color: '#475569', marginTop: 2 },
  progress: { marginTop: 8, color: '#4F46E5', fontWeight: '700' },
});
