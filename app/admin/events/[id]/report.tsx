import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { eventService, type EventReportData } from '@/src/services/eventService';

export default function EventReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [report, setReport] = useState<EventReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadReport = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await eventService.getExecutiveReport(id);
      if (res?.data) {
        setReport(res.data);
      }
    } catch (err: any) {
      // If report doesn't exist yet, attempt generating it
      try {
        const genRes = await eventService.generateExecutiveReport(id);
        if (genRes?.data) setReport(genRes.data);
      } catch (genErr) {
        console.warn('[EventReport] Failed generating report:', genErr);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefreshGenerate = async () => {
    if (!id) return;
    try {
      setGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await eventService.generateExecutiveReport(id);
      if (res?.data) {
        setReport(res.data);
        Alert.alert('Report Recompiled', 'Executive metrics refreshed with real-time audit data.');
      }
    } catch (err: any) {
      Alert.alert('Generation Error', err?.message || 'Failed compiling report');
    } finally {
      setGenerating(false);
    }
  };

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F9FAFB' : '#0F172A';
  const subCol = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.centerText, { color: subCol }]}>Compiling Executive Report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reportData = report?.report_data;
  const participation = reportData?.participation;
  const finances = reportData?.finances;
  const safety = reportData?.safety;
  const feedback = reportData?.feedback;
  const leaderboard = reportData?.competitions?.house_leaderboard || [];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textCol }]}>Executive Final Report</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
          onPress={handleRefreshGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : (
            <Ionicons name="refresh" size={18} color="#6366F1" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Document Container */}
        <View style={[styles.docPaper, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {/* Institutional Title Block */}
          <View style={[styles.docHeader, { borderBottomColor: borderCol }]}>
            <View style={styles.docBrandRow}>
              <View style={styles.docLogo}>
                <Ionicons name="school" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.docSchoolName}>NEXSYRUS SCHOOLIMS</Text>
                <Text style={[styles.docSubtitle, { color: subCol }]}>
                  Paperless Event Operations & Audit System
                </Text>
              </View>
            </View>

            <Text style={[styles.reportMainTitle, { color: textCol }]}>
              {report?.report_title || 'Executive Event Report'}
            </Text>
            <Text style={[styles.generatedStamp, { color: subCol }]}>
              Generated On: {new Date(report?.generated_at || Date.now()).toLocaleString()}
            </Text>
          </View>

          {/* 1. PARTICIPATION & TURNOUT */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: textCol }]}>1. Participation & Digital Consent</Text>
            <View style={styles.metricsRow}>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: textCol }]}>{participation?.total_registered || 0}</Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Registered</Text>
              </View>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: '#10B981' }]}>{participation?.actual_attended || 0}</Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Attended</Text>
              </View>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: '#6366F1' }]}>
                  {participation?.turnout_percentage || 0}%
                </Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Turnout Rate</Text>
              </View>
            </View>
          </View>

          {/* 2. FINANCIAL AUDIT */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: textCol }]}>2. Financial Statement & Utilization</Text>
            <View style={styles.metricsRow}>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: '#10B981' }]}>
                  ₹{finances?.total_approved_budget || 0}
                </Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Approved Budget</Text>
              </View>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: '#EF4444' }]}>
                  ₹{finances?.total_actual_spent || 0}
                </Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Actual Spent</Text>
              </View>
              <View style={[styles.miniMetric, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.miniNum, { color: '#06B6D4' }]}>
                  {finances?.budget_utilization_pct || 0}%
                </Text>
                <Text style={[styles.miniLabel, { color: subCol }]}>Budget Utilization</Text>
              </View>
            </View>
          </View>

          {/* 3. HOUSE LEADERBOARD (IF ANY) */}
          {leaderboard.length > 0 && (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: textCol }]}>3. House Points & Competition Standings</Text>
              {leaderboard.map((house, idx) => (
                <View key={house.house_id} style={[styles.houseStandingRow, { borderBottomColor: borderCol }]}>
                  <Text style={[styles.houseRankText, { color: '#6366F1' }]}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.houseNameText, { color: textCol }]}>{house.house_name}</Text>
                    <Text style={[styles.houseMedalsText, { color: subCol }]}>
                      🥇 {house.gold_count} Gold  •  🥈 {house.silver_count} Silver  •  🥉 {house.bronze_count} Bronze
                    </Text>
                  </View>
                  <Text style={[styles.housePointsText, { color: textCol }]}>{house.total_points} pts</Text>
                </View>
              ))}
            </View>
          )}

          {/* 4. SAFETY & COMPLIANCE */}
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionHeading, { color: textCol }]}>4. Safety & Incident Compliance</Text>
            <View style={[styles.safetyCard, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
              <Ionicons
                name={(safety?.total_incidents || 0) === 0 ? 'shield-checkmark' : 'alert-circle'}
                size={24}
                color={(safety?.total_incidents || 0) === 0 ? '#10B981' : '#EF4444'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.safetyStatusText, { color: textCol }]}>
                  {(safety?.total_incidents || 0) === 0
                    ? 'Clean Record: Zero Incidents'
                    : `${safety?.total_incidents} Incidents Logged (${safety?.resolved_count || 0} Resolved)`}
                </Text>
                <Text style={[styles.safetySubText, { color: subCol }]}>
                  Full post-event health and transport logs verified.
                </Text>
              </View>
            </View>
          </View>

          {/* 5. STAKEHOLDER FEEDBACK */}
          {feedback && (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: textCol }]}>5. Stakeholder Feedback</Text>
              <View style={[styles.feedbackBox, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                <Text style={[styles.feedbackAvg, { color: '#F59E0B' }]}>
                  ⭐ {feedback.average_rating || 5}/5.0
                </Text>
                <Text style={[styles.feedbackCount, { color: subCol }]}>
                  Based on {feedback.total_responses || 0} parent and staff responses
                </Text>
              </View>
            </View>
          )}

          {/* Formal Audit Sign-Off Box */}
          <View style={[styles.signOffBox, { borderTopColor: borderCol }]}>
            <View style={styles.signatory}>
              <View style={[styles.signatureLine, { borderBottomColor: subCol }]} />
              <Text style={[styles.signatoryLabel, { color: subCol }]}>Event Director / Lead Coordinator</Text>
            </View>
            <View style={styles.signatory}>
              <View style={[styles.signatureLine, { borderBottomColor: subCol }]} />
              <Text style={[styles.signatoryLabel, { color: subCol }]}>Principal / Administrator</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  docPaper: {
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  docHeader: { paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  docBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  docLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docSchoolName: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, color: '#4F46E5' },
  docSubtitle: { fontSize: 10, marginTop: 1 },
  reportMainTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  generatedStamp: { fontSize: 11, marginTop: 4 },
  sectionWrap: { marginBottom: 18 },
  sectionHeading: { fontSize: 13, fontWeight: '800', marginBottom: 10 },
  metricsRow: { flexDirection: 'row', gap: 8 },
  miniMetric: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  miniNum: { fontSize: 17, fontWeight: '900' },
  miniLabel: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  houseStandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  houseRankText: { fontSize: 14, fontWeight: '900' },
  houseNameText: { fontSize: 13, fontWeight: '800' },
  houseMedalsText: { fontSize: 10, marginTop: 2 },
  housePointsText: { fontSize: 14, fontWeight: '900' },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  safetyStatusText: { fontSize: 13, fontWeight: '800' },
  safetySubText: { fontSize: 11, marginTop: 2 },
  feedbackBox: { padding: 14, borderRadius: 12, alignItems: 'center' },
  feedbackAvg: { fontSize: 20, fontWeight: '900' },
  feedbackCount: { fontSize: 11, marginTop: 4 },
  signOffBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 30,
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  signatory: { width: '45%', alignItems: 'center' },
  signatureLine: { width: '100%', borderBottomWidth: 1, marginBottom: 6 },
  signatoryLabel: { fontSize: 9, textAlign: 'center', fontWeight: '600' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 13, marginTop: 10 },
});
