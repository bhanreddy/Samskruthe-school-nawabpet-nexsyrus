import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import AdminHeader from '../../../src/components/AdminHeader';
import LogoLoader from '../../../src/components/LogoLoader';
import { useAuth } from '../../../src/hooks/useAuth';
import { useTheme } from '../../../src/hooks/useTheme';
import { FeatureRouteGuard, FEATURE_KEYS } from '../../../src/features/feature-access';
import type {
  AcademicSummary,
  AttendanceSummary,
  FeeCollectionSummary,
  Insight,
  StaffSummary,
  TimeRange,
  TrendPoint,
} from '../../../src/services/analyticsService';
import { api } from '../../../src/services/apiClient';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type AnalyticsGroup = 'finance' | 'attendance' | 'academic' | 'staff' | 'system' | 'alerts';

type AnalyticsSnapshot = {
  financials: FeeCollectionSummary | null;
  attendance: AttendanceSummary | null;
  academics: AcademicSummary | null;
  staff: StaffSummary | null;
  insights: Insight[];
};

type MetricDefinition = {
  title: string;
  eyebrow: string;
  description: string;
  group: AnalyticsGroup;
  icon: IconName;
  accent: string;
  gradient: [string, string];
  value: (snapshot: AnalyticsSnapshot) => string;
  context: (snapshot: AnalyticsSnapshot) => string;
};

const money = (value?: number | null) =>
  value == null ? '—' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (value?: number | null) => value == null ? '—' : `${Number(value.toFixed(1))}%`;
const count = (value?: number | null) => value == null ? '—' : Number(value).toLocaleString('en-IN');

const METRICS: Record<string, MetricDefinition> = {
  'total-collected': {
    title: 'Total fee collection', eyebrow: 'FINANCIAL HEALTH', group: 'finance', icon: 'wallet', accent: '#10B981', gradient: ['#064E3B', '#10B981'],
    description: 'A complete view of fee receipts, class-wise realization and the collection pipeline.',
    value: ({ financials }) => money(financials?.lifetime_collected ?? financials?.total_collected),
    context: ({ financials }) => `${pct(financials?.collection_efficiency)} collection efficiency`,
  },
  'today-collection': {
    title: "Today's collection", eyebrow: 'DAILY CASHFLOW', group: 'finance', icon: 'today', accent: '#8B5CF6', gradient: ['#4C1D95', '#8B5CF6'],
    description: 'Track receipts posted today and see them in the context of the current collection period.',
    value: ({ financials }) => money(financials?.today_collection),
    context: () => 'Receipts recorded today',
  },
  'outstanding-dues': {
    title: 'Outstanding dues', eyebrow: 'FEE RECOVERY', group: 'finance', icon: 'alert-circle', accent: '#EF4444', gradient: ['#7F1D1D', '#EF4444'],
    description: 'Prioritize overdue balances with class-level exposure and the students needing attention first.',
    value: ({ financials }) => money(financials?.outstanding_dues),
    context: ({ financials }) => `${count(financials?.top_pending?.length)} priority accounts`,
  },
  'collection-efficiency': {
    title: 'Collection efficiency', eyebrow: 'REALIZATION RATE', group: 'finance', icon: 'trending-up', accent: '#3B82F6', gradient: ['#1E3A8A', '#3B82F6'],
    description: 'Understand how much of the invoiced amount has been realized and where recovery can improve.',
    value: ({ financials }) => pct(financials?.collection_efficiency),
    context: ({ financials }) => `${money(financials?.total_collected)} collected in period`,
  },
  discounts: {
    title: 'Discounts & concessions', eyebrow: 'FEE GOVERNANCE', group: 'finance', icon: 'pricetag', accent: '#F59E0B', gradient: ['#78350F', '#F59E0B'],
    description: 'Review the total value of concessions granted alongside invoicing and net realization.',
    value: ({ financials }) => money(financials?.discount_given),
    context: ({ financials }) => `Against ${money(financials?.total_invoiced)} invoiced`,
  },
  refunds: {
    title: 'Refunds issued', eyebrow: 'TRANSACTION CONTROL', group: 'finance', icon: 'return-up-back', accent: '#06B6D4', gradient: ['#164E63', '#06B6D4'],
    description: 'Monitor fee reversals and refunds as part of the school’s financial control view.',
    value: ({ financials }) => money(financials?.refunds_issued),
    context: ({ financials }) => `${pct(financials?.collection_efficiency)} net efficiency`,
  },
  'revenue-trend': {
    title: 'Revenue trend', eyebrow: 'COLLECTION MOMENTUM', group: 'finance', icon: 'analytics', accent: '#3B82F6', gradient: ['#172554', '#2563EB'],
    description: 'See fee collection momentum across the selected period and compare it with current dues.',
    value: ({ financials }) => money(financials?.total_collected),
    context: () => 'Collected across the selected period',
  },
  'average-attendance': {
    title: 'Average attendance', eyebrow: 'STUDENT ENGAGEMENT', group: 'attendance', icon: 'people', accent: '#3B82F6', gradient: ['#172554', '#3B82F6'],
    description: 'A school-wide attendance pulse with class comparison and early-warning context.',
    value: ({ attendance }) => pct(attendance?.avg_attendance),
    context: ({ attendance }) => attendance?.period?.label || 'Current academic period',
  },
  'at-risk': {
    title: 'Students at risk', eyebrow: 'EARLY INTERVENTION', group: 'attendance', icon: 'warning', accent: '#F59E0B', gradient: ['#78350F', '#F59E0B'],
    description: 'Identify students below 75% attendance and focus interventions where absence is most persistent.',
    value: ({ attendance }) => count(attendance?.chronic_absentees),
    context: ({ attendance }) => `${count(attendance?.low_attendance_students?.length)} students in priority list`,
  },
  'working-days': {
    title: 'Working days', eyebrow: 'ACADEMIC CALENDAR', group: 'attendance', icon: 'calendar', accent: '#10B981', gradient: ['#064E3B', '#10B981'],
    description: 'Understand the active attendance window and the student-days captured during it.',
    value: ({ attendance }) => count(attendance?.total_working_days),
    context: ({ attendance }) => `${count(attendance?.total_present_days)} student-days present`,
  },
  'staff-attendance': {
    title: 'Staff attendance', eyebrow: 'PEOPLE OPERATIONS', group: 'attendance', icon: 'id-card', accent: '#8B5CF6', gradient: ['#4C1D95', '#8B5CF6'],
    description: 'Monitor the staff attendance signal alongside the school’s broader attendance performance.',
    value: ({ attendance }) => pct(attendance?.staff_attendance),
    context: () => 'Attendance captured for the selected period',
  },
  'attendance-trend': {
    title: 'Attendance trend', eyebrow: 'DAILY PULSE', group: 'attendance', icon: 'pulse', accent: '#10B981', gradient: ['#064E3B', '#10B981'],
    description: 'Follow daily attendance movement and spot meaningful changes before they become patterns.',
    value: ({ attendance }) => pct(attendance?.avg_attendance),
    context: ({ attendance }) => `${count(attendance?.chronic_absentees)} students below 75%`,
  },
  'average-score': {
    title: 'Average score', eyebrow: 'ACADEMIC OUTCOMES', group: 'academic', icon: 'ribbon', accent: '#8B5CF6', gradient: ['#4C1D95', '#8B5CF6'],
    description: 'View the school-wide examination average with subject performance context.',
    value: ({ academics }) => pct(academics?.avg_score),
    context: ({ academics }) => `${count(academics?.exams_conducted)} exams included`,
  },
  'pass-rate': {
    title: 'Student pass rate', eyebrow: 'LEARNING SUCCESS', group: 'academic', icon: 'checkmark-circle', accent: '#10B981', gradient: ['#064E3B', '#10B981'],
    description: 'Measure overall student success and compare pass performance across subjects.',
    value: ({ academics }) => pct(academics?.pass_rate),
    context: ({ academics }) => `${academics?.top_subject || '—'} leads performance`,
  },
  'top-subject': {
    title: 'Top-performing subject', eyebrow: 'ACADEMIC STRENGTH', group: 'academic', icon: 'trophy', accent: '#3B82F6', gradient: ['#172554', '#3B82F6'],
    description: 'Celebrate the strongest subject area and see how it compares with the wider curriculum.',
    value: ({ academics }) => academics?.top_subject || '—',
    context: ({ academics }) => `${pct(academics?.avg_score)} school average`,
  },
  'needs-focus': {
    title: 'Subject needing focus', eyebrow: 'IMPROVEMENT PRIORITY', group: 'academic', icon: 'trending-down', accent: '#EF4444', gradient: ['#7F1D1D', '#EF4444'],
    description: 'Surface the subject requiring the most support and compare its outcomes with other subjects.',
    value: ({ academics }) => academics?.weakest_subject || '—',
    context: ({ academics }) => `${pct(academics?.pass_rate)} overall pass rate`,
  },
  'exams-conducted': {
    title: 'Exams conducted', eyebrow: 'ASSESSMENT COVERAGE', group: 'academic', icon: 'document-text', accent: '#06B6D4', gradient: ['#164E63', '#06B6D4'],
    description: 'Review the assessment volume feeding the academic performance picture.',
    value: ({ academics }) => count(academics?.exams_conducted),
    context: ({ academics }) => `${count(academics?.by_subject?.length)} subjects represented`,
  },
  'score-trend': {
    title: 'Score trend', eyebrow: 'PERFORMANCE MOMENTUM', group: 'academic', icon: 'bar-chart', accent: '#8B5CF6', gradient: ['#4C1D95', '#8B5CF6'],
    description: 'Track movement in average examination results across the selected reporting period.',
    value: ({ academics }) => pct(academics?.avg_score),
    context: ({ academics }) => `${pct(academics?.pass_rate)} pass rate`,
  },
  'total-staff': {
    title: 'Total staff', eyebrow: 'WORKFORCE OVERVIEW', group: 'staff', icon: 'people-circle', accent: '#F59E0B', gradient: ['#78350F', '#F59E0B'],
    description: 'A concise workforce view of active strength, attendance, leave and recent movement.',
    value: ({ staff }) => count(staff?.total_staff),
    context: ({ staff }) => `${count(staff?.active_staff)} active staff members`,
  },
  'on-leave': {
    title: 'Staff on leave', eyebrow: 'TODAY’S AVAILABILITY', group: 'staff', icon: 'moon', accent: '#EF4444', gradient: ['#7F1D1D', '#EF4444'],
    description: 'See today’s leave impact alongside active workforce and attendance levels.',
    value: ({ staff }) => count(staff?.on_leave_today),
    context: () => 'Approved leave affecting today',
  },
  'new-joinings': {
    title: 'New staff joinings', eyebrow: 'TEAM GROWTH', group: 'staff', icon: 'person-add', accent: '#06B6D4', gradient: ['#164E63', '#06B6D4'],
    description: 'Track recent additions to the school team within the selected reporting period.',
    value: ({ staff }) => count(staff?.new_joinings),
    context: ({ staff }) => `${count(staff?.resignations)} departures in period`,
  },
  'staff-attendance-rate': {
    title: 'Staff attendance rate', eyebrow: 'WORKFORCE RELIABILITY', group: 'staff', icon: 'calendar', accent: '#3B82F6', gradient: ['#172554', '#3B82F6'],
    description: 'Monitor staff availability and its relationship to leave and active workforce levels.',
    value: ({ staff }) => pct(staff?.avg_staff_attendance),
    context: ({ staff }) => `${count(staff?.on_leave_today)} on leave today`,
  },
  status: {
    title: 'School operations status', eyebrow: 'LIVE OPERATIONS', group: 'system', icon: 'shield-checkmark', accent: '#10B981', gradient: ['#064E3B', '#10B981'],
    description: 'A live management pulse spanning staffing, collections, attendance, academics and active alerts.',
    value: ({ insights }) => insights.some((item) => item.severity === 'high') ? 'Attention needed' : 'All systems operational',
    context: ({ insights }) => `${count(insights.length)} active management alerts`,
  },
  'active-alerts': {
    title: 'Active management alerts', eyebrow: 'PRINCIPAL ACTION CENTRE', group: 'alerts', icon: 'notifications', accent: '#EF4444', gradient: ['#7F1D1D', '#EF4444'],
    description: 'Review the signals requiring intervention across fees, attendance, academics and staff.',
    value: ({ insights }) => count(insights.length),
    context: ({ insights }) => `${count(insights.filter((item) => item.severity === 'high').length)} high priority`,
  },
};

const RANGE_LABELS: Record<TimeRange, string> = { month: 'Month', quarter: 'Quarter', year: 'Academic YTD' };

const CACHE_TTL_MS = 15 * 1000;

type CachedSnapshot = {
  data: AnalyticsSnapshot;
  fetchedAt: number;
};

const analyticsCache = new Map<string, CachedSnapshot>();
const pendingAnalyticsRequests = new Map<string, Promise<CachedSnapshot>>();

const emptySnapshot = (): AnalyticsSnapshot => ({
  financials: null,
  attendance: null,
  academics: null,
  staff: null,
  insights: [],
});

function cacheKey(scopeKey: string, group: AnalyticsGroup, range: TimeRange) {
  return `${scopeKey}:${group}:${range}`;
}

async function requestSnapshot(group: AnalyticsGroup, range: TimeRange, force = false): Promise<CachedSnapshot> {
  const data = emptySnapshot();
  const attendancePeriod = range === 'month' ? 'month' : 'academic_year';
  const silent = { silent: true } as const;
  const forceParam = force ? { force: 'true' } : {};

  if (group === 'finance') {
    data.financials = await api.get<FeeCollectionSummary>('/admin/analytics/financials', { range, ...forceParam }, silent);
  }
  if (group === 'attendance') {
    data.attendance = await api.get<AttendanceSummary>('/admin/analytics/attendance', { period: attendancePeriod, ...forceParam }, silent);
  }
  if (group === 'academic') {
    data.academics = await api.get<AcademicSummary>('/admin/analytics/academics', { range, ...forceParam }, silent);
  }
  if (group === 'staff') {
    data.staff = await api.get<StaffSummary>('/admin/analytics/staff', force ? { force: 'true' } : undefined, silent);
  }
  if (group === 'alerts') {
    data.insights = await api.get<Insight[]>('/admin/analytics/insights', { range, period: attendancePeriod, ...forceParam }, silent);
  }
  if (group === 'system') {
    const [fin, att, acad, staff, insights] = await Promise.all([
      api.get<FeeCollectionSummary>('/admin/analytics/financials', { range, ...forceParam }, silent).catch(() => null),
      api.get<AttendanceSummary>('/admin/analytics/attendance', { period: attendancePeriod, ...forceParam }, silent).catch(() => null),
      api.get<AcademicSummary>('/admin/analytics/academics', { range, ...forceParam }, silent).catch(() => null),
      api.get<StaffSummary>('/admin/analytics/staff', force ? { force: 'true' } : undefined, silent).catch(() => null),
      api.get<Insight[]>('/admin/analytics/insights', { range, period: attendancePeriod, ...forceParam }, silent).catch(() => []),
    ]);
    data.financials = fin;
    data.attendance = att;
    data.academics = acad;
    data.staff = staff;
    data.insights = insights || [];
  }

  return { data, fetchedAt: Date.now() };
}

function getSnapshot(scopeKey: string, group: AnalyticsGroup, range: TimeRange, force = false) {
  const key = cacheKey(scopeKey, group, range);
  const cached = analyticsCache.get(key);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return Promise.resolve(cached);
  }

  // Coalesce rapid taps, focus effects and remounts into one network request.
  const pending = pendingAnalyticsRequests.get(key);
  if (pending && !force) return pending;

  const request = requestSnapshot(group, range, force)
    .then((result) => {
      analyticsCache.set(key, result);
      return result;
    })
    .finally(() => {
      if (pendingAnalyticsRequests.get(key) === request) pendingAnalyticsRequests.delete(key);
    });

  pendingAnalyticsRequests.set(key, request);
  return request;
}

function useMetricAnalytics(group: AnalyticsGroup, scopeKey: string | null) {
  const [range, setRange] = useState<TimeRange>('month');
  const effectiveRange: TimeRange = group === 'staff'
    ? 'month'
    : group === 'attendance' && range === 'quarter'
      ? 'year'
      : range;
  const currentKey = scopeKey ? cacheKey(scopeKey, group, effectiveRange) : null;
  const initial = currentKey ? analyticsCache.get(currentKey) : undefined;
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(initial?.data ?? emptySnapshot);
  const [fetchedAt, setFetchedAt] = useState<number | null>(initial?.fetchedAt ?? null);
  const [loadedKey, setLoadedKey] = useState<string | null>(initial ? currentKey : null);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async (force = false) => {
    if (!scopeKey) return;
    const sequence = ++requestSequence.current;
    const cached = analyticsCache.get(cacheKey(scopeKey, group, effectiveRange));

    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setSnapshot(cached.data);
      setFetchedAt(cached.fetchedAt);
      setLoadedKey(currentKey);
      setError(null);
      setLoading(false);
      return;
    }

    if (force) setRefreshing(true);
    else {
      setLoading(true);
      if (!cached) {
        setSnapshot(emptySnapshot());
        setFetchedAt(null);
        setLoadedKey(currentKey);
      }
    }
    setError(null);

    try {
      const result = await getSnapshot(scopeKey, group, effectiveRange, force);
      if (sequence !== requestSequence.current) return;
      setSnapshot(result.data);
      setFetchedAt(result.fetchedAt);
      setLoadedKey(currentKey);
    } catch (requestError: any) {
      if (sequence !== requestSequence.current) return;
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load analytics.');
      // A stale cached snapshot is safer and more useful than a blank page.
      if (cached) {
        setSnapshot(cached.data);
        setFetchedAt(cached.fetchedAt);
        setLoadedKey(currentKey);
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [scopeKey, group, effectiveRange, currentKey]);

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  const selectRange = useCallback((nextRange: TimeRange) => {
    if (nextRange !== effectiveRange) setRange(nextRange);
  }, [effectiveRange]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const visibleSnapshot = loadedKey === currentKey ? snapshot : emptySnapshot();
  const visibleFetchedAt = loadedKey === currentKey ? fetchedAt : null;

  return {
    ...visibleSnapshot,
    range: effectiveRange,
    setRange: selectRange,
    loading: loading || (!!scopeKey && loadedKey !== currentKey),
    refreshing,
    error,
    refreshData: refresh,
    generatedAt: visibleFetchedAt ? new Date(visibleFetchedAt).toISOString() : null,
  };
}

function Surface({ children, style, isDark }: { children: React.ReactNode; style?: any; isDark: boolean }) {
  return <View style={[styles.surface, {
    backgroundColor: isDark ? '#151C2C' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(148,163,184,0.18)',
  }, Platform.OS === 'web' ? { boxShadow: isDark ? '0 16px 46px rgba(0,0,0,.28)' : '0 16px 46px rgba(30,41,59,.09)' } : styles.nativeShadow, style]}>{children}</View>;
}

function MiniStat({ label, value, icon, color, isDark, wide }: { label: string; value: string; icon: IconName; color: string; isDark: boolean; wide: boolean }) {
  return <Surface isDark={isDark} style={[styles.miniCard, { width: wide ? '31.8%' : '48.3%' }]}>
    <View style={[styles.miniIcon, { backgroundColor: `${color}16`, borderColor: `${color}2A` }]}><Ionicons name={icon} size={18} color={color} /></View>
    <Text style={[styles.miniValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={1}>{value}</Text>
    <Text style={[styles.miniLabel, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>{label}</Text>
  </Surface>;
}

function SectionTitle({ eyebrow, title, accent, isDark }: { eyebrow: string; title: string; accent: string; isDark: boolean }) {
  return <View style={styles.sectionHeading}>
    <View style={[styles.sectionMark, { backgroundColor: accent }]} />
    <View><Text style={[styles.sectionEyebrow, { color: accent }]}>{eyebrow}</Text><Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{title}</Text></View>
  </View>;
}

function EmptyState({
  isDark,
  icon = 'analytics-outline',
  title = 'No detailed records for this period',
  message = 'Choose another reporting period or pull down to refresh.',
}: {
  isDark: boolean;
  icon?: IconName;
  title?: string;
  message?: string;
}) {
  return <View style={styles.emptyState}>
    <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
      <Ionicons name={icon} size={24} color="#94A3B8" />
    </View>
    <Text style={[styles.emptyTitle, { color: isDark ? '#E2E8F0' : '#334155' }]}>{title}</Text>
    <Text style={styles.emptyCopy}>{message}</Text>
  </View>;
}

export default function AnalyticsMetricScreen() {
  const params = useLocalSearchParams<{ metric?: string; insightId?: string }>();
  const metricSlug = Array.isArray(params.metric) ? params.metric[0] : params.metric;
  const selectedInsightId = Array.isArray(params.insightId) ? params.insightId[0] : params.insightId;
  const definition = METRICS[metricSlug || ''] ?? METRICS.status;
  const router = useRouter();
  const { user } = useAuth();
  // Analytics are school-scoped on the server; keying by school safely reuses
  // cached results across same-school admin account switches without cross-school leakage.
  const analyticsScopeKey = user ? String(user.schoolId) : null;
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 900;
  const {
    financials, attendance, academics, staff, insights, range, setRange,
    loading, refreshing, error, refreshData, generatedAt,
  } = useMetricAnalytics(definition.group, analyticsScopeKey);

  const snapshot = useMemo<AnalyticsSnapshot>(() => ({ financials, attendance, academics, staff, insights }), [financials, attendance, academics, staff, insights]);
  const cards = useMemo(() => {
    if (definition.group === 'finance') return [
      { label: 'Collected', value: money(financials?.total_collected), icon: 'wallet' as IconName, color: '#10B981' },
      { label: 'Invoiced', value: money(financials?.total_invoiced), icon: 'receipt' as IconName, color: '#3B82F6' },
      { label: 'Outstanding', value: money(financials?.outstanding_dues), icon: 'alert-circle' as IconName, color: '#EF4444' },
      { label: 'Efficiency', value: pct(financials?.collection_efficiency), icon: 'trending-up' as IconName, color: '#8B5CF6' },
      { label: 'Discounts', value: money(financials?.discount_given), icon: 'pricetag' as IconName, color: '#F59E0B' },
      { label: 'Refunds', value: money(financials?.refunds_issued), icon: 'return-up-back' as IconName, color: '#06B6D4' },
    ];
    if (definition.group === 'attendance') return [
      { label: 'Average', value: pct(attendance?.avg_attendance), icon: 'people' as IconName, color: '#3B82F6' },
      { label: 'At risk', value: count(attendance?.chronic_absentees), icon: 'warning' as IconName, color: '#F59E0B' },
      { label: 'Working days', value: count(attendance?.total_working_days), icon: 'calendar' as IconName, color: '#10B981' },
      { label: 'Staff attendance', value: pct(attendance?.staff_attendance), icon: 'id-card' as IconName, color: '#8B5CF6' },
    ];
    if (definition.group === 'academic') return [
      { label: 'Average score', value: pct(academics?.avg_score), icon: 'ribbon' as IconName, color: '#8B5CF6' },
      { label: 'Pass rate', value: pct(academics?.pass_rate), icon: 'checkmark-circle' as IconName, color: '#10B981' },
      { label: 'Top subject', value: academics?.top_subject || '—', icon: 'trophy' as IconName, color: '#3B82F6' },
      { label: 'Needs focus', value: academics?.weakest_subject || '—', icon: 'trending-down' as IconName, color: '#EF4444' },
      { label: 'Exams', value: count(academics?.exams_conducted), icon: 'document-text' as IconName, color: '#06B6D4' },
    ];
    if (definition.group === 'alerts') return [
      { label: 'High priority', value: count(insights.filter((item) => item.severity === 'high').length), icon: 'alert-circle' as IconName, color: '#EF4444' },
      { label: 'Medium priority', value: count(insights.filter((item) => item.severity === 'medium').length), icon: 'warning' as IconName, color: '#F59E0B' },
      { label: 'Finance', value: count(insights.filter((item) => item.category === 'finance').length), icon: 'wallet' as IconName, color: '#10B981' },
      { label: 'Attendance', value: count(insights.filter((item) => item.category === 'attendance').length), icon: 'people' as IconName, color: '#3B82F6' },
      { label: 'Academic', value: count(insights.filter((item) => item.category === 'academic').length), icon: 'school' as IconName, color: '#8B5CF6' },
      { label: 'Staff', value: count(insights.filter((item) => item.category === 'staff').length), icon: 'id-card' as IconName, color: '#06B6D4' },
    ];
    const workforceCards = [
      { label: 'Total staff', value: count(staff?.total_staff), icon: 'people-circle' as IconName, color: '#F59E0B' },
      { label: 'Active', value: count(staff?.active_staff), icon: 'checkmark-circle' as IconName, color: '#10B981' },
      { label: 'On leave', value: count(staff?.on_leave_today), icon: 'moon' as IconName, color: '#EF4444' },
      { label: 'Attendance', value: pct(staff?.avg_staff_attendance), icon: 'calendar' as IconName, color: '#3B82F6' },
      { label: 'New joinings', value: count(staff?.new_joinings), icon: 'person-add' as IconName, color: '#06B6D4' },
      { label: 'Departures', value: count(staff?.resignations), icon: 'exit' as IconName, color: '#8B5CF6' },
    ];
    if (definition.group === 'system') {
      return [
        ...workforceCards.slice(0, 4),
        { label: 'Active alerts', value: count(insights.length), icon: 'notifications' as IconName, color: '#EF4444' },
        { label: 'High priority', value: count(insights.filter((item) => item.severity === 'high').length), icon: 'flash' as IconName, color: '#F59E0B' },
      ];
    }
    return workforceCards;
  }, [definition.group, financials, attendance, academics, staff, insights]);

  const trend = useMemo<TrendPoint[]>(() => {
    if (definition.group === 'finance') return financials?.trend ?? [];
    if (definition.group === 'attendance') return attendance?.trend ?? [];
    if (definition.group === 'academic') return academics?.trend ?? [];
    return [];
  }, [definition.group, financials?.trend, attendance?.trend, academics?.trend]);
  const chartWidth = Math.max(250, Math.min(wide ? 850 : width - 76, 850));
  const displayedInsights = useMemo(
    () => selectedInsightId
      ? [...insights].sort((left, right) => Number(right.id === selectedInsightId) - Number(left.id === selectedInsightId))
      : insights,
    [insights, selectedInsightId],
  );
  const primaryRoute = definition.group === 'finance' ? '/admin/finance' : definition.group === 'attendance' ? '/admin/attendance' : definition.group === 'academic' ? '/admin/exam-analytics' : definition.group === 'staff' ? '/admin/manage-staff' : '/admin/reports';
  const primaryLabel = definition.group === 'finance' ? 'Open finance operations' : definition.group === 'attendance' ? 'Open attendance register' : definition.group === 'academic' ? 'Open exam analytics' : definition.group === 'staff' ? 'Manage staff' : 'Open analytics cockpit';
  const supportsTrend = definition.group === 'finance' || definition.group === 'attendance' || definition.group === 'academic';
  const chartData = useMemo(
    () => definition.group === 'academic'
      ? trend.map((point) => ({ ...point, frontColor: definition.accent }))
      : trend,
    [definition.group, definition.accent, trend],
  );
  const initialLoading = loading && !generatedAt;
  const rangeOptions = useMemo<TimeRange[]>(() => {
    if (definition.group === 'staff') return ['month'];
    if (definition.group === 'attendance') return ['month', 'year'];
    return ['month', 'quarter', 'year'];
  }, [definition.group]);
  const periodDescription = attendance?.period?.label
    ? `${RANGE_LABELS[range]} · ${attendance.period.label}`
    : definition.group === 'staff'
      ? 'Current month'
      : RANGE_LABELS[range];

  const renderBreakdown = () => {
    if (metricSlug === 'outstanding-dues' && financials?.top_pending?.length) return financials.top_pending.map((student, index) => (
      <View key={`${student.student_name}-${index}`} style={[styles.dataRow, index < financials.top_pending.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: '#EF444416' }]}><Text style={{ color: '#EF4444', fontWeight: '900' }}>{index + 1}</Text></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{student.student_name}</Text><Text style={styles.rowMeta}>{student.class_section} · {student.overdue_days} days overdue</Text></View></View>
        <Text style={[styles.rowAmount, { color: '#EF4444' }]}>{money(student.amount_due)}</Text>
      </View>
    ));
    if (metricSlug === 'at-risk' && attendance?.low_attendance_students?.length) return attendance.low_attendance_students.map((student, index) => (
      <View key={`${student.student_name}-${index}`} style={[styles.dataRow, index < attendance.low_attendance_students.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: '#F59E0B16' }]}><Ionicons name="warning" size={16} color="#F59E0B" /></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{student.student_name}</Text><Text style={styles.rowMeta}>{student.class_section} · {student.absent_days} absent days</Text></View></View>
        <Text style={[styles.rowAmount, { color: student.attendance_pct < 65 ? '#EF4444' : '#F59E0B' }]}>{pct(student.attendance_pct)}</Text>
      </View>
    ));
    if (definition.group === 'finance' && financials?.by_class?.length) return financials.by_class.map((row, index) => (
      <View key={`${row.class_name}-${row.section_name}`} style={[styles.dataRow, index < financials.by_class.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: '#10B98116' }]}><Text style={{ color: '#10B981', fontWeight: '900' }}>{index + 1}</Text></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{row.class_name} · {row.section_name}</Text><Text style={styles.rowMeta}>{money(row.outstanding)} pending</Text></View></View>
        <View style={styles.rowRight}><Text style={[styles.rowAmount, { color: '#10B981' }]}>{money(row.collected)}</Text><Text style={styles.rowMeta}>{pct(row.efficiency)} realized</Text></View>
      </View>
    ));
    if (definition.group === 'attendance' && attendance?.by_class?.length) return attendance.by_class.map((row, index) => (
      <View key={`${row.class_name}-${row.section_name}`} style={[styles.dataRow, index < attendance.by_class.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: row.avg_pct < 75 ? '#EF444416' : '#3B82F616' }]}><Ionicons name={row.avg_pct < 75 ? 'warning' : 'school'} size={15} color={row.avg_pct < 75 ? '#EF4444' : '#3B82F6'} /></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{row.class_name} · {row.section_name}</Text><Text style={styles.rowMeta}>{row.total_students} students · {row.below_threshold} at risk</Text></View></View>
        <Text style={[styles.rowAmount, { color: row.avg_pct < 75 ? '#EF4444' : '#3B82F6' }]}>{pct(row.avg_pct)}</Text>
      </View>
    ));
    if (definition.group === 'academic' && academics?.by_subject?.length) return academics.by_subject.map((row, index) => (
      <View key={row.subject_name} style={[styles.dataRow, index < academics.by_subject.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: '#8B5CF616' }]}><Text style={{ color: '#8B5CF6', fontWeight: '900' }}>{index + 1}</Text></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{row.subject_name}</Text><Text style={styles.rowMeta}>{pct(row.pass_rate)} pass · range {row.lowest}–{row.highest}</Text></View></View>
        <Text style={[styles.rowAmount, { color: '#8B5CF6' }]}>{pct(row.avg_score)}</Text>
      </View>
    ));
    if (definition.group === 'staff' && staff) {
      if (staff.by_department && staff.by_department.length > 0) {
        return staff.by_department.map((dept, index) => (
          <View key={dept.department} style={[styles.dataRow, index < staff.by_department!.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
            <View style={styles.rowIdentity}>
              <View style={[styles.rankBadge, { backgroundColor: '#F59E0B16' }]}>
                <Ionicons name="id-card" size={15} color="#F59E0B" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{dept.department}</Text>
                <Text style={styles.rowMeta}>{dept.count} staff member{dept.count !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <Text style={[styles.rowAmount, { color: '#F59E0B' }]}>{pct(dept.attendance_pct)}</Text>
          </View>
        ));
      }
      return [
        { label: 'Available today', value: Math.max((staff.active_staff ?? 0) - (staff.on_leave_today ?? 0), 0), icon: 'checkmark-circle' as IconName, color: '#10B981', note: `${count(staff.active_staff)} active team members` },
        { label: 'Team movement', value: (staff.new_joinings ?? 0) - (staff.resignations ?? 0), icon: 'swap-horizontal' as IconName, color: '#06B6D4', note: `${count(staff.new_joinings)} joined · ${count(staff.resignations)} departed` },
        { label: 'Attendance health', value: staff.avg_staff_attendance, icon: 'pulse' as IconName, color: '#3B82F6', note: 'Average for the selected period' },
      ].map((row, index, rows) => <View key={row.label} style={[styles.dataRow, index < rows.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }]}>
        <View style={styles.rowIdentity}><View style={[styles.rankBadge, { backgroundColor: `${row.color}16` }]}><Ionicons name={row.icon} size={16} color={row.color} /></View><View><Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{row.label}</Text><Text style={styles.rowMeta}>{row.note}</Text></View></View>
        <Text style={[styles.rowAmount, { color: row.color }]}>{row.label === 'Attendance health' ? pct(row.value) : count(row.value)}</Text>
      </View>);
    }
    if ((definition.group === 'alerts' || definition.group === 'system') && displayedInsights.length) return displayedInsights.map((item, index) => {
      const severityColor = item.severity === 'high' ? '#EF4444' : item.severity === 'medium' ? '#F59E0B' : '#3B82F6';
      const selected = item.id === selectedInsightId;
      const rowStyle = [styles.alertRow, index < displayedInsights.length - 1 && styles.rowDivider, { borderColor: isDark ? '#243047' : '#EEF2F7' }, selected && { backgroundColor: `${severityColor}0B` }];
      const content = <>
        <View style={[styles.alertIcon, { backgroundColor: `${severityColor}16` }]}><Ionicons name={item.severity === 'high' ? 'alert-circle' : 'information-circle'} size={19} color={severityColor} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.alertCategory, { color: severityColor }]}>{item.severity.toUpperCase()} · {item.category.toUpperCase()}</Text><Text style={[styles.alertMessage, { color: isDark ? '#E2E8F0' : '#334155' }]}>{item.message}</Text></View>
        {item.action_route ? <Ionicons name="chevron-forward" size={18} color="#94A3B8" /> : null}
      </>;
      return item.action_route
        ? <Pressable
          key={item.id}
          onPress={() => router.push(item.action_route as any)}
          accessibilityRole="button"
          accessibilityLabel={`${item.category} alert. ${item.message}. Open action.`}
          style={({ pressed }) => [rowStyle, pressed && styles.rowPressed]}
        >{content}</Pressable>
        : <View key={item.id} style={rowStyle}>{content}</View>;
    });
    if (definition.group === 'alerts' || definition.group === 'system') {
      return <EmptyState
        isDark={isDark}
        icon="shield-checkmark-outline"
        title="No active alerts"
        message="Everything in this reporting period is currently on track."
      />;
    }
    return <EmptyState isDark={isDark} />;
  };

  return (
    <FeatureRouteGuard feature={FEATURE_KEYS.ANALYTICS}>
      <View style={[styles.root, { backgroundColor: isDark ? '#090E18' : '#F7F9FC' }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
    <AdminHeader title={definition.title} showBackButton />
    <View pointerEvents="none" style={StyleSheet.absoluteFill}><View style={[styles.ambient, { backgroundColor: `${definition.accent}12`, top: 130, right: -100 }]} /><View style={[styles.ambient, { backgroundColor: '#8B5CF60B', top: 460, left: -120 }]} /></View>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.page, wide && styles.pageWide]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} tintColor={definition.accent} colors={[definition.accent]} />}
    >
      <LinearGradient colors={definition.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, wide && styles.heroWide]}>
        <View style={styles.heroOrbOne} /><View style={styles.heroOrbTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}><Ionicons name={definition.icon} size={27} color="#FFFFFF" /></View>
          <View style={styles.livePill} accessibilityRole="text" accessibilityLiveRegion="polite">
            <View style={[styles.liveDot, (loading || refreshing) && styles.loadingDot]} />
            <Text style={styles.liveText}>{loading || refreshing ? 'UPDATING' : 'LIVE SCHOOL DATA'}</Text>
          </View>
        </View>
        <Text style={styles.heroEyebrow}>{definition.eyebrow}</Text>
        <Text style={[styles.heroTitle, wide && styles.heroTitleWide]}>{definition.title}</Text>
        <Text style={[styles.heroDescription, wide && { maxWidth: 670 }]}>{definition.description}</Text>
        <View style={styles.heroMetricRow}><Text style={[styles.heroValue, wide && styles.heroValueWide]} numberOfLines={2}>{definition.value(snapshot)}</Text><View style={styles.heroContext}><Ionicons name="sparkles" size={14} color="#FFFFFF" /><Text style={styles.heroContextText}>{definition.context(snapshot)}</Text></View></View>
        {rangeOptions.length > 1 ? <View style={styles.filterBlock}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.82)" />
              <Text style={styles.filterLabel}>REPORTING PERIOD</Text>
              <Text style={styles.filterValue}>{periodDescription}</Text>
            </View>
            <View style={styles.rangeRow}>
              {rangeOptions.map((item) => {
                const selected = range === item;
                return <Pressable
                  key={item}
                  onPress={() => setRange(item)}
                  disabled={loading || refreshing}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${RANGE_LABELS[item]} analytics`}
                  accessibilityState={{ selected, disabled: loading || refreshing }}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    selected && styles.rangeButtonActive,
                    pressed && !selected && styles.rangeButtonPressed,
                    (loading || refreshing) && !selected && styles.rangeButtonDisabled,
                  ]}
                >
                  <Text style={[styles.rangeText, selected && styles.rangeTextActive]}>{RANGE_LABELS[item]}</Text>
                </Pressable>;
              })}
            </View>
          </View> : <View style={styles.staticPeriodRow}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.82)" />
            <Text style={styles.filterLabel}>DATA WINDOW</Text>
            <Text style={styles.filterValue}>Current month</Text>
          </View>}
      </LinearGradient>

      {initialLoading ? <Surface isDark={isDark} style={styles.loadingCard}><LogoLoader size={44} color={definition.accent} /><View><Text style={[styles.loadingText, { color: isDark ? '#CBD5E1' : '#475569' }]}>Preparing your analytics view…</Text><Text style={styles.loadingSubtext}>Loading only the data needed for this screen.</Text></View></Surface> : null}
      {error ? <Surface isDark={isDark} style={styles.errorCard}><Ionicons name="cloud-offline" size={22} color="#EF4444" /><View style={{ flex: 1 }}><Text style={[styles.errorTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Analytics could not refresh</Text><Text style={styles.errorCopy}>{error}</Text></View><Pressable onPress={refreshData} accessibilityRole="button" accessibilityLabel="Retry loading analytics" style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}><Text style={styles.retryText}>Retry</Text></Pressable></Surface> : null}

      {generatedAt ? <>
      <SectionTitle eyebrow="AT A GLANCE" title="Supporting indicators" accent={definition.accent} isDark={isDark} />
      <View style={styles.miniGrid}>{cards.map((card) => <MiniStat key={card.label} {...card} isDark={isDark} wide={wide} />)}</View>

      {supportsTrend ? <>
        <SectionTitle
          eyebrow="MOMENTUM"
          title={definition.group === 'academic' ? 'Assessment performance' : definition.group === 'attendance' ? 'Attendance movement' : 'Period trend'}
          accent={definition.accent}
          isDark={isDark}
        />
        <Surface isDark={isDark} style={styles.chartCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Trend intelligence</Text>
              <Text style={styles.cardSubtitle}>{periodDescription}</Text>
            </View>
            <View style={[styles.chartBadge, { backgroundColor: `${definition.accent}14` }]}>
              <Ionicons name="pulse" size={15} color={definition.accent} />
              <Text style={[styles.chartBadgeText, { color: definition.accent }]}>LIVE DATA</Text>
            </View>
          </View>
          {chartData.length ? <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScroll}
            accessibilityLabel={`${definition.title} trend chart for ${periodDescription}`}
          >
            {definition.group === 'academic' ? <BarChart
              data={chartData}
              height={190}
              width={chartWidth}
              barWidth={wide ? 30 : 22}
              barBorderRadius={7}
              noOfSections={4}
              maxValue={100}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              rulesColor={isDark ? '#FFFFFF0A' : '#0F172A0A'}
              showGradient={Platform.OS !== 'android'}
              gradientColor={`${definition.accent}25`}
              isAnimated={Platform.OS !== 'android'}
              animationDuration={650}
            /> : <LineChart
              data={chartData}
              height={190}
              width={chartWidth}
              color={definition.accent}
              thickness={3}
              startFillColor={`${definition.accent}35`}
              endFillColor={`${definition.accent}02`}
              startOpacity={Platform.OS === 'android' ? 0 : 1}
              endOpacity={0}
              initialSpacing={16}
              noOfSections={4}
              dataPointsColor={definition.accent}
              dataPointsRadius={Platform.OS === 'android' ? 0 : 4}
              hideDataPoints={Platform.OS === 'android'}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              rulesColor={isDark ? '#FFFFFF0A' : '#0F172A0A'}
              curved={Platform.OS !== 'android'}
              isAnimated={Platform.OS !== 'android'}
              animationDuration={650}
            />}
          </ScrollView> : <EmptyState
            isDark={isDark}
            title="No trend recorded in this period"
            message="The chart will appear as soon as activity is recorded."
          />}
        </Surface>
      </> : null}

      <SectionTitle eyebrow="DRILL DOWN" title={definition.group === 'alerts' || definition.group === 'system' ? 'Action queue' : definition.group === 'staff' ? 'Workforce picture' : 'Detailed breakdown'} accent={definition.accent} isDark={isDark} />
      <Surface isDark={isDark} style={styles.breakdownCard}>{renderBreakdown()}</Surface>

      <LinearGradient colors={isDark ? ['#151C2C', '#111827'] : ['#FFFFFF', '#F1F5FF']} style={[styles.actionCard, { borderColor: `${definition.accent}26` }]}>
        <View style={[styles.actionIcon, { backgroundColor: `${definition.accent}16` }]}><Ionicons name="school" size={24} color={definition.accent} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Continue from insight to action</Text><Text style={styles.actionCopy}>Open the operational workspace or compare every management area in the full analytics cockpit.</Text></View>
        <View style={[styles.actionButtons, !wide && { width: '100%' }]}>
          <Pressable
            onPress={() => router.push(primaryRoute as any)}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: definition.accent }, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
          {primaryRoute !== '/admin/reports' ? <Pressable
            onPress={() => router.push('/admin/reports')}
            accessibilityRole="button"
            accessibilityLabel="Open full analytics report"
            style={({ pressed }) => [styles.secondaryButton, { borderColor: isDark ? '#334155' : '#DCE3EF' }, pressed && styles.buttonPressed]}
          >
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#CBD5E1' : '#475569' }]}>Full report</Text>
          </Pressable> : null}
        </View>
      </LinearGradient>
      <View style={styles.updatedRow}><View style={[styles.updatedDot, { backgroundColor: definition.accent }]} /><Text style={styles.updatedText}>{generatedAt ? `Last synchronized ${new Date(generatedAt).toLocaleString()}` : 'Waiting for the first synchronized snapshot'}</Text></View>
      </> : null}
      </ScrollView>
    </View>
    </FeatureRouteGuard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, page: { padding: 18, paddingBottom: 56 }, pageWide: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 28 },
  ambient: { position: 'absolute', width: 320, height: 320, borderRadius: 160 },
  surface: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' }, nativeShadow: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.09, shadowRadius: 24, elevation: Platform.OS === 'android' ? 0 : 6 },
  hero: { borderRadius: 30, padding: 22, minHeight: 330, overflow: 'hidden', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: Platform.OS === 'android' ? 0 : 9 }, heroWide: { padding: 34, minHeight: 360 },
  heroOrbOne: { position: 'absolute', width: 230, height: 230, borderRadius: 115, right: -65, top: -80, backgroundColor: 'rgba(255,255,255,0.12)' }, heroOrbTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: 100, bottom: -105, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }, heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' }, livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 99 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86EFAC' }, loadingDot: { backgroundColor: '#FDE68A' }, liveText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 7 }, heroTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900', letterSpacing: -0.7 }, heroTitleWide: { fontSize: 36, lineHeight: 42 }, heroDescription: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20, fontWeight: '500', marginTop: 10 },
  heroMetricRow: { marginTop: 24, flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }, heroValue: { color: '#FFFFFF', fontSize: 36, lineHeight: 43, fontWeight: '900', letterSpacing: -1.2, maxWidth: '100%' }, heroValueWide: { fontSize: 48, lineHeight: 56 }, heroContext: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11 }, heroContextText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  filterBlock: { marginTop: 22, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.22)' }, staticPeriodRow: { marginTop: 22, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.22)', flexDirection: 'row', alignItems: 'center', gap: 7 }, filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, filterLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, filterValue: { marginLeft: 'auto', color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  rangeRow: { flexDirection: 'row', gap: 7, marginTop: 10 }, rangeButton: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }, rangeButtonActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }, rangeButtonPressed: { backgroundColor: 'rgba(255,255,255,0.20)' }, rangeButtonDisabled: { opacity: 0.55 }, rangeText: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '800' }, rangeTextActive: { color: '#0F172A' },
  loadingCard: { marginTop: 18, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 15 }, loadingText: { fontSize: 13, fontWeight: '700' }, loadingSubtext: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 4 }, errorCard: { marginTop: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, errorTitle: { fontSize: 13, fontWeight: '800' }, errorCopy: { color: '#94A3B8', fontSize: 11, marginTop: 2 }, retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, minHeight: 38, justifyContent: 'center' }, retryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 30, marginBottom: 13, paddingHorizontal: 3 }, sectionMark: { width: 4, height: 34, borderRadius: 3 }, sectionEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginBottom: 3 }, sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.35 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, miniCard: { padding: 15, minHeight: 128 }, miniIcon: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, miniValue: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 }, miniLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 5 },
  chartCard: { paddingTop: 2 }, cardHeader: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { fontSize: 16, fontWeight: '800' }, cardSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 4 }, chartBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, chartBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, chartScroll: { paddingHorizontal: 12, paddingBottom: 18, minWidth: '100%', justifyContent: 'center' }, axisText: { color: '#94A3B8', fontSize: 9 },
  breakdownCard: { paddingHorizontal: 16 }, dataRow: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth }, rowIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, rankBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 13, fontWeight: '800' }, rowMeta: { color: '#94A3B8', fontSize: 10, fontWeight: '600', marginTop: 3 }, rowRight: { alignItems: 'flex-end' }, rowAmount: { fontSize: 14, fontWeight: '900' },
  alertRow: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 11 }, rowPressed: { opacity: 0.78 }, alertIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, alertCategory: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }, alertMessage: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  emptyState: { paddingVertical: 34, paddingHorizontal: 20, alignItems: 'center' }, emptyIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: '800', textAlign: 'center' }, emptyCopy: { color: '#94A3B8', fontSize: 11, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  actionCard: { marginTop: 30, padding: 18, borderRadius: 25, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, overflow: 'hidden' }, actionIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, actionTitle: { fontSize: 15, fontWeight: '800' }, actionCopy: { color: '#94A3B8', fontSize: 11, lineHeight: 17, marginTop: 4, maxWidth: 460 }, actionButtons: { gap: 8 }, primaryButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 13 }, primaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' }, secondaryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13, borderWidth: 1 }, secondaryButtonText: { fontSize: 11, fontWeight: '800' }, buttonPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  updatedRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, updatedDot: { width: 6, height: 6, borderRadius: 3 }, updatedText: { color: '#94A3B8', fontSize: 9, fontWeight: '600' },
});
