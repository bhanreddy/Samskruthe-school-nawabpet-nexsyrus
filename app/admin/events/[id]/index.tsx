import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import {
  eventService,
  type EventItem,
  type EventConsentSummary,
  type EventConsentRosterItem,
  type EventRegistrationItem,
  type EventTaskItem,
  type EventBudgetExpenseData,
  type HouseLeaderboardItem,
  type EventIncidentItem,
} from '@/src/services/eventService';

type TabKey =
  | 'OVERVIEW'
  | 'REGISTRATIONS'
  | 'CONSENT'
  | 'PASSES'
  | 'TRANSPORT'
  | 'TASKS'
  | 'ATTENDANCE'
  | 'BUDGET'
  | 'COMPETITIONS'
  | 'INCIDENTS'
  | 'CLOSURE';

export default function EventCommandCenterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Data States
  const [event, setEvent] = useState<EventItem | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [registrations, setRegistrations] = useState<EventRegistrationItem[]>([]);
  const [consentSummary, setConsentSummary] = useState<EventConsentSummary | null>(null);
  const [consentRoster, setConsentRoster] = useState<EventConsentRosterItem[]>([]);
  const [transportData, setTransportData] = useState<any>(null);
  const [tasks, setTasks] = useState<EventTaskItem[]>([]);
  const [budgetData, setBudgetData] = useState<EventBudgetExpenseData | null>(null);
  const [leaderboard, setLeaderboard] = useState<HouseLeaderboardItem[]>([]);
  const [incidents, setIncidents] = useState<EventIncidentItem[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [incidentText, setIncidentText] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [
        eventRes,
        dashRes,
        regRes,
        consentSumRes,
        consentRosterRes,
        transportRes,
        tasksRes,
        budgetRes,
        leaderboardRes,
        incidentsRes,
        passesRes,
        attendanceRes,
      ] = await Promise.all([
        eventService.getEventById(id).catch(() => null),
        eventService.getEventDashboard(id).catch(() => null),
        eventService.getRegistrations(id).catch(() => null),
        eventService.getConsentSummary(id).catch(() => null),
        eventService.getConsentRoster(id).catch(() => null),
        eventService.getTransportData(id).catch(() => null),
        eventService.getTasks(id).catch(() => null),
        eventService.getBudgetSummary(id).catch(() => null),
        eventService.getHouseLeaderboard(id).catch(() => null),
        eventService.getIncidents(id).catch(() => null),
        eventService.listPasses(id).catch(() => null),
        eventService.getAttendanceDashboard(id).catch(() => null),
      ]);

      if (eventRes?.data) setEvent(eventRes.data);
      if (dashRes?.data) setDashboardData(dashRes.data);
      if (regRes?.data) setRegistrations(regRes.data);
      if (consentSumRes?.data) setConsentSummary(consentSumRes.data);
      if (consentRosterRes?.data) setConsentRoster(consentRosterRes.data);
      if (transportRes?.data) {
        const td = transportRes.data as any;
        setTransportData(Array.isArray(td) ? { assignments: td, manifests: [] } : td);
      }
      if (tasksRes?.data) setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      if (budgetRes?.data) setBudgetData(budgetRes.data);
      if (leaderboardRes?.data) setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
      if (incidentsRes?.data) setIncidents(incidentsRes.data);
      if (passesRes?.data) setPasses(passesRes.data);
      if (attendanceRes?.data) setAttendance(attendanceRes.data);
    } catch (err) {
      console.warn('[EventCommandCenter] Error loading details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  };

  // Actions
  const handleBulkIssuePasses = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await eventService.bulkIssuePasses(id);
      Alert.alert('Passes Generated', `Successfully issued ${res.data?.issued_count || 0} QR passes.`);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to issue passes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitApproval = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await eventService.submitForApproval(id, { remarks: 'Submitted by administrator for formal sign-off' });
      Alert.alert('Submitted', 'Event sent for leadership approval review.');
      loadData();
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit approval');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveEvent = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await eventService.recordApprovalDecision(id, 'APPROVED', 'Administrator fast-track approval granted');
      Alert.alert('Approved', 'Event is approved and active!');
      loadData();
    } catch (err: any) {
      Alert.alert('Approval Error', err?.message || 'Failed to approve event');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteWaitlist = async (studentId: string) => {
    if (!id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await eventService.promoteWaitlist(id, studentId);
      Alert.alert('Promoted', 'Student has been moved from waitlist to confirmed participant.');
      loadData();
    } catch (err: any) {
      Alert.alert('Promotion Error', err?.message || 'Failed to promote student');
    }
  };

  const handleCloseEvent = async () => {
    if (!id) return;
    Alert.alert(
      'Conclude & Lock Event',
      'This will mark the event as CLOSED, lock all registers, and automatically compile the Executive Final Report. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Closure',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await eventService.closeEvent(id);
              Alert.alert('Event Closed', 'Event concluded successfully and Executive Report generated.');
              router.push(`/admin/events/${id}/report`);
            } catch (err: any) {
              Alert.alert('Closure Error', err?.message || 'Failed to close event');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F9FAFB' : '#0F172A';
  const subCol = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.centerLoaderText, { color: subCol }]}>Loading Command Center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.centerLoader}>
          <Text style={[styles.errorTitle, { color: textCol }]}>Event Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Return to Hub</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const readiness = event.readiness_score || 0;
  const readinessColor = readiness >= 80 ? '#10B981' : readiness >= 50 ? '#F59E0B' : '#EF4444';
  const modules = event.config?.modules || event.configuration?.modules || {};
  const hasQr = Boolean(modules.ticketing || modules.qr_passes);
  const hasBudget = Boolean(modules.budget || modules.expenses);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: textCol }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.headerSub, { color: subCol }]}>
            {event.event_type?.replace(/_/g, ' ')} • Status: {event.status}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: 'rgba(99,102,241,0.12)' }]}
          onPress={() => router.push(`/admin/events/${id}/report`)}
        >
          <Ionicons name="document-text-outline" size={18} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Hero Strip */}
      <View style={[styles.heroBanner, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <View style={styles.heroLeft}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.statusPill, { backgroundColor: event.status === 'ONGOING' ? '#10B98122' : '#6366F122' }]}>
              <Text style={[styles.statusPillText, { color: event.status === 'ONGOING' ? '#10B981' : '#6366F1' }]}>
                {event.status}
              </Text>
            </View>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={12} color={subCol} />
              <Text style={[styles.dateChipText, { color: subCol }]}>
                {new Date(event.start_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroVenue, { color: subCol }]} numberOfLines={1}>
            Venue: {event.location || 'Campus'}
          </Text>
        </View>

        {/* Readiness Ring */}
        <View style={[styles.readinessCard, { borderColor: readinessColor }]}>
          <Text style={[styles.readinessScoreNum, { color: readinessColor }]}>{readiness}%</Text>
          <Text style={[styles.readinessScoreTitle, { color: subCol }]}>READINESS</Text>
        </View>
      </View>

      {/* Submodule Tabs Scroll */}
      <View style={[styles.tabsBar, { borderBottomColor: borderCol }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'OVERVIEW', label: 'Overview', icon: 'speedometer-outline' },
            { key: 'REGISTRATIONS', label: 'Roster', icon: 'people-outline', count: registrations.length },
            ...(modules.consent ? [{ key: 'CONSENT', label: 'Consent', icon: 'shield-checkmark-outline', count: consentSummary?.consented_count }] : []),
            ...(hasQr ? [{ key: 'PASSES', label: 'QR Passes', icon: 'qr-code-outline' }] : []),
            ...(modules.transport ? [{ key: 'TRANSPORT', label: 'Transport', icon: 'bus-outline' }] : []),
            { key: 'TASKS', label: 'Tasks', icon: 'list-outline', count: tasks.filter((t) => t.status !== 'COMPLETED').length },
            { key: 'ATTENDANCE', label: 'Attendance', icon: 'checkbox-outline' },
            ...(hasBudget ? [{ key: 'BUDGET', label: 'Finances', icon: 'wallet-outline' }] : []),
            ...(modules.competition ? [{ key: 'COMPETITIONS', label: 'Competitions', icon: 'trophy-outline' }] : []),
            { key: 'INCIDENTS', label: 'Safety', icon: 'alert-circle-outline', count: incidents.filter((i) => !i.is_resolved).length },
            { key: 'CLOSURE', label: 'Closure', icon: 'checkmark-done-circle-outline' },
          ].map((tab: any) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  active && { backgroundColor: isDark ? 'rgba(79,70,229,0.3)' : 'rgba(79,70,229,0.12)' },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
              >
                <Ionicons name={tab.icon} size={15} color={active ? '#6366F1' : subCol} />
                <Text style={[styles.tabText, { color: active ? '#6366F1' : subCol }]}>{tab.label}</Text>
                {tab.count !== undefined && tab.count > 0 && (
                  <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* ======================= TAB: OVERVIEW ======================= */}
        {activeTab === 'OVERVIEW' && (
          <View>
            {/* Quick Actions Row */}
            <View style={styles.actionsStrip}>
              {event.status === 'DRAFT' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
                  onPress={handleSubmitApproval}
                >
                  <Ionicons name="paper-plane" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Submit Approval</Text>
                </TouchableOpacity>
              )}

              {(event.status === 'PENDING_APPROVAL' || event.status === 'AWAITING_APPROVAL') && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                  onPress={handleApproveEvent}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Approve Event</Text>
                </TouchableOpacity>
              )}

              {event.status === 'APPROVED' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
                  onPress={async () => {
                    try {
                      setActionLoading(true);
                      await eventService.publishEvent(id);
                      Alert.alert('Published', 'Event is live for the target audience.');
                      loadData();
                    } catch (err: any) {
                      Alert.alert('Publish failed', err?.message || 'Unable to publish');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                >
                  <Ionicons name="megaphone" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Publish</Text>
                </TouchableOpacity>
              )}

              {hasQr && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#06B6D4' }]}
                  onPress={() => router.push(`/admin/events/${id}/scanner`)}
                >
                  <Ionicons name="scan" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Open Scanner</Text>
                </TouchableOpacity>
              )}

              {event.status !== 'CLOSED' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#334155' }]}
                  onPress={handleCloseEvent}
                >
                  <Ionicons name="lock-closed-outline" size={16} color="#FFF" />
                  <Text style={styles.actionBtnText}>Conclude</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Metrics Grid */}
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="people" size={18} color="#6366F1" />
                <Text style={[styles.metricVal, { color: textCol }]}>{registrations.length}</Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Registered Students</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={[styles.metricVal, { color: '#10B981' }]}>
                  {consentSummary?.consent_percentage || 0}%
                </Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Parent Consented</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="wallet" size={18} color="#06B6D4" />
                <Text style={[styles.metricVal, { color: textCol }]}>
                  ₹{budgetData?.totals?.total_actual_spent || 0}
                </Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Total Spent</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="alert-circle" size={18} color={incidents.length > 0 ? '#EF4444' : '#10B981'} />
                <Text style={[styles.metricVal, { color: incidents.length > 0 ? '#EF4444' : '#10B981' }]}>
                  {incidents.filter((i) => !i.is_resolved).length}
                </Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Active Incidents</Text>
              </View>
            </View>

            {/* Readiness Checklist */}
            <View style={[styles.sectionBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.sectionTitle, { color: textCol }]}>Operational Readiness Checklist</Text>
              <Text style={[styles.sectionSubtitle, { color: subCol }]}>
                Audit gate required before live gatekeeper entry and transport departure
              </Text>

              {[
                { label: 'Event Signoff & Approval', done: event.status !== 'DRAFT' && event.status !== 'PENDING_APPROVAL' && event.status !== 'AWAITING_APPROVAL' },
                { label: 'Parent Consent Threshold (>75%)', done: (consentSummary?.consent_percentage || 0) >= 75 },
                { label: 'Staff Supervisors Assigned', done: tasks.length > 0 },
                { label: 'Transport Vehicles Dispatched', done: (transportData?.assignments?.length || 0) > 0 },
                { label: 'Budget Allocations Verified', done: (budgetData?.totals?.total_approved || 0) > 0 },
                { label: 'Zero Unresolved Critical Incidents', done: incidents.filter((i) => !i.is_resolved).length === 0 },
              ].map((item, idx) => (
                <View key={idx} style={styles.checkItem}>
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={item.done ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.checkText, { color: item.done ? textCol : subCol }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ======================= TAB: REGISTRATIONS ======================= */}
        {activeTab === 'REGISTRATIONS' && (
          <View>
            <View style={styles.tabHeaderRow}>
              <Text style={[styles.tabSectionTitle, { color: textCol }]}>
                Registered Participants ({registrations.length})
              </Text>
              <TouchableOpacity
                style={[styles.smallActionBtn, { backgroundColor: '#4F46E5' }]}
                onPress={handleBulkIssuePasses}
              >
                <Ionicons name="qr-code" size={14} color="#FFF" />
                <Text style={styles.smallActionBtnText}>Issue All Passes</Text>
              </TouchableOpacity>
            </View>

            {registrations.length === 0 ? (
              <View style={[styles.emptyTabBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="people-outline" size={32} color={subCol} />
                <Text style={[styles.emptyTabText, { color: subCol }]}>No registered students yet</Text>
              </View>
            ) : (
              registrations.map((reg) => (
                <View key={reg.id} style={[styles.regCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.regInfoCol}>
                    <Text style={[styles.regStudentName, { color: textCol }]}>{reg.student_name || 'Student'}</Text>
                    <Text style={[styles.regSub, { color: subCol }]}>
                      Adm: {reg.admission_no} • {reg.class_name || 'General'}
                    </Text>
                  </View>

                  <View style={styles.regStatusCol}>
                    <View
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor:
                            reg.registration_status === 'CONFIRMED'
                              ? '#10B98122'
                              : reg.registration_status === 'WAITLISTED'
                              ? '#F59E0B22'
                              : '#6366F122',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          {
                            color:
                              reg.registration_status === 'CONFIRMED'
                                ? '#10B981'
                                : reg.registration_status === 'WAITLISTED'
                                ? '#F59E0B'
                                : '#6366F1',
                          },
                        ]}
                      >
                        {reg.registration_status}
                      </Text>
                    </View>

                    {reg.registration_status === 'WAITLISTED' && (
                      <TouchableOpacity
                        style={styles.promoteBtn}
                        onPress={() => handlePromoteWaitlist(reg.student_id)}
                      >
                        <Text style={styles.promoteBtnText}>Promote</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================= TAB: CONSENT ======================= */}
        {activeTab === 'CONSENT' && (
          <View>
            {consentSummary && (
              <View style={[styles.consentBanner, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.consentHeaderRow}>
                  <Text style={[styles.consentTitle, { color: textCol }]}>Parent Consent Tracking</Text>
                  <Text style={[styles.consentPct, { color: '#10B981' }]}>
                    {consentSummary.consent_percentage}% Consented
                  </Text>
                </View>
                <View style={styles.progressOuter}>
                  <View style={[styles.progressInner, { width: `${consentSummary.consent_percentage}%` }]} />
                </View>
                <View style={styles.consentStatsStrip}>
                  <Text style={[styles.statItem, { color: subCol }]}>
                    Consented: <Text style={{ color: '#10B981', fontWeight: '800' }}>{consentSummary.consented_count}</Text>
                  </Text>
                  <Text style={[styles.statItem, { color: subCol }]}>
                    Declined: <Text style={{ color: '#EF4444', fontWeight: '800' }}>{consentSummary.declined_count}</Text>
                  </Text>
                  <Text style={[styles.statItem, { color: subCol }]}>
                    Pending: <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{consentSummary.pending_count}</Text>
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.tabSectionTitle, { color: textCol, marginTop: 14 }]}>Consent Roster</Text>
            {consentRoster.map((item) => (
              <View key={item.registration_id} style={[styles.consentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.consentCardTop}>
                  <View>
                    <Text style={[styles.regStudentName, { color: textCol }]}>{item.student_name}</Text>
                    <Text style={[styles.regSub, { color: subCol }]}>Parent: {item.parent_name || 'Guardian'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          item.consent_status === 'CONSENTED'
                            ? '#10B98122'
                            : item.consent_status === 'DECLINED'
                            ? '#EF444422'
                            : '#F59E0B22',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        {
                          color:
                            item.consent_status === 'CONSENTED'
                              ? '#10B981'
                              : item.consent_status === 'DECLINED'
                              ? '#EF4444'
                              : '#F59E0B',
                        },
                      ]}
                    >
                      {item.consent_status}
                    </Text>
                  </View>
                </View>

                {item.parent_remarks && (
                  <View style={styles.medicalBox}>
                    <Ionicons name="medkit-outline" size={14} color="#EC4899" />
                    <Text style={[styles.medicalText, { color: textCol }]}>Note: {item.parent_remarks}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: TRANSPORT ======================= */}
        {activeTab === 'TRANSPORT' && (
          <View>
            <Text style={[styles.tabSectionTitle, { color: textCol }]}>Bus Allocations & Boarding</Text>
            {(transportData?.assignments || []).map((bus: any) => (
              <View key={bus.id} style={[styles.busCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.busHeader}>
                  <View style={styles.busIconCircle}>
                    <Ionicons name="bus" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.busTitle, { color: textCol }]}>
                      Bus #{bus.bus_no || bus.bus_number} ({bus.registration_no || bus.registration_number})
                    </Text>
                    <Text style={[styles.busSub, { color: subCol }]}>
                      Capacity: {bus.assigned_students || 0}/{bus.capacity || 40} Students
                    </Text>
                  </View>
                </View>

                <View style={styles.busRouteRow}>
                  <Ionicons name="navigate-outline" size={14} color="#6366F1" />
                  <Text style={[styles.busRouteText, { color: subCol }]}>
                    {bus.route_description || 'Direct School Campus Route'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: TASKS ======================= */}
        {activeTab === 'TASKS' && (
          <View>
            <Text style={[styles.tabSectionTitle, { color: textCol }]}>Kanban Committee Tasks</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="Add a task"
                placeholderTextColor={subCol}
                style={{ flex: 1, borderWidth: 1, borderColor: borderCol, borderRadius: 10, paddingHorizontal: 12, color: textCol, height: 44 }}
              />
              <TouchableOpacity
                style={[styles.smallActionBtn, { backgroundColor: '#4F46E5' }]}
                onPress={async () => {
                  if (!taskTitle.trim()) return;
                  await eventService.createTask(id, { title: taskTitle.trim(), priority: 'MEDIUM', status: 'TODO' } as any);
                  setTaskTitle('');
                  loadData();
                }}
              >
                <Text style={styles.smallActionBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {tasks.map((task) => (
              <View key={task.id} style={[styles.taskCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.taskTop}>
                  <Text style={[styles.taskTitle, { color: textCol }]}>{task.title}</Text>
                  <View style={[styles.taskPriorityPill, { backgroundColor: task.priority === 'URGENT' ? '#EF444422' : '#6366F122' }]}>
                    <Text style={[styles.taskPriorityText, { color: task.priority === 'URGENT' ? '#EF4444' : '#6366F1' }]}>
                      {task.priority}
                    </Text>
                  </View>
                </View>
                {task.description && (
                  <Text style={[styles.taskDesc, { color: subCol }]}>{task.description}</Text>
                )}
                <View style={styles.taskFooter}>
                  <Text style={[styles.taskAssignee, { color: subCol }]}>
                    Assigned: {task.assigned_name || 'Staff Member'}
                  </Text>
                  <View style={[styles.taskStatusPill, { backgroundColor: task.status === 'COMPLETED' ? '#10B98122' : '#F59E0B22' }]}>
                    <Text style={[styles.taskStatusText, { color: task.status === 'COMPLETED' ? '#10B981' : '#F59E0B' }]}>
                      {task.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: BUDGET ======================= */}
        {activeTab === 'BUDGET' && budgetData && (
          <View>
            <View style={[styles.budgetSummaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.sectionTitle, { color: textCol }]}>Budget vs Actual Expenditure</Text>
              <View style={styles.budgetRow}>
                <View>
                  <Text style={[styles.budgetNum, { color: '#10B981' }]}>
                    ₹{budgetData.totals.total_approved}
                  </Text>
                  <Text style={[styles.budgetLabel, { color: subCol }]}>Approved Budget</Text>
                </View>
                <View>
                  <Text style={[styles.budgetNum, { color: '#EF4444' }]}>
                    ₹{budgetData.totals.total_actual_spent}
                  </Text>
                  <Text style={[styles.budgetLabel, { color: subCol }]}>Actual Spent</Text>
                </View>
                <View>
                  <Text style={[styles.budgetNum, { color: '#06B6D4' }]}>
                    {budgetData.totals.budget_utilization_pct}%
                  </Text>
                  <Text style={[styles.budgetLabel, { color: subCol }]}>Utilization</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.tabSectionTitle, { color: textCol, marginTop: 14 }]}>Expenses Record</Text>
            {budgetData.expenses.map((exp) => (
              <View key={exp.id} style={[styles.expenseItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View>
                  <Text style={[styles.expensePayee, { color: textCol }]}>{exp.payee_name}</Text>
                  <Text style={[styles.expenseCat, { color: subCol }]}>{exp.category}</Text>
                </View>
                <Text style={[styles.expenseAmount, { color: textCol }]}>₹{exp.amount}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: COMPETITIONS ======================= */}
        {activeTab === 'COMPETITIONS' && (
          <View>
            <Text style={[styles.tabSectionTitle, { color: textCol }]}>House Points Leaderboard</Text>
            {leaderboard.map((house, idx) => (
              <View key={house.house_id} style={[styles.leaderboardRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.rankPill}>
                  <Text style={styles.rankNum}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.houseName, { color: textCol }]}>{house.house_name}</Text>
                  <Text style={[styles.medalCount, { color: subCol }]}>
                    🥇 {house.gold_count}  🥈 {house.silver_count}  🥉 {house.bronze_count}
                  </Text>
                </View>
                <Text style={[styles.housePoints, { color: '#6366F1' }]}>{house.total_points} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: INCIDENTS ======================= */}
        {activeTab === 'INCIDENTS' && (
          <View>
            <View style={styles.tabHeaderRow}>
              <Text style={[styles.tabSectionTitle, { color: textCol }]}>Safety Incidents Log</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                value={incidentText}
                onChangeText={setIncidentText}
                placeholder="Report an incident"
                placeholderTextColor={subCol}
                style={{ flex: 1, borderWidth: 1, borderColor: borderCol, borderRadius: 10, paddingHorizontal: 12, color: textCol, height: 44 }}
              />
              <TouchableOpacity
                style={[styles.smallActionBtn, { backgroundColor: '#EF4444' }]}
                onPress={async () => {
                  if (!incidentText.trim()) return;
                  await eventService.reportIncident(id, { incidentType: 'OTHER', severity: 'MEDIUM', description: incidentText.trim() });
                  setIncidentText('');
                  loadData();
                }}
              >
                <Text style={styles.smallActionBtnText}>Log</Text>
              </TouchableOpacity>
            </View>
            {incidents.length === 0 ? (
              <View style={[styles.emptyTabBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                <Text style={[styles.emptyTabText, { color: textCol }]}>Zero Incidents Reported. All Safe!</Text>
              </View>
            ) : (
              incidents.map((inc) => (
                <View key={inc.id} style={[styles.incidentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.incTop}>
                    <Text style={[styles.incType, { color: textCol }]}>{inc.incident_type}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: inc.severity === 'CRITICAL' ? '#EF444422' : '#F59E0B22' }]}>
                      <Text style={[styles.severityText, { color: inc.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B' }]}>
                        {inc.severity}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.incDesc, { color: subCol }]}>{inc.description}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================= TAB: PASSES ======================= */}
        {activeTab === 'PASSES' && (
          <View>
            <View style={styles.tabHeaderRow}>
              <Text style={[styles.tabSectionTitle, { color: textCol }]}>QR Passes ({passes.length})</Text>
              <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: '#4F46E5' }]} onPress={handleBulkIssuePasses}>
                <Ionicons name="qr-code" size={14} color="#FFF" />
                <Text style={styles.smallActionBtnText}>Issue missing</Text>
              </TouchableOpacity>
            </View>
            {passes.length === 0 ? (
              <View style={[styles.emptyTabBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.emptyTabText, { color: subCol }]}>No passes issued yet</Text>
              </View>
            ) : (
              passes.map((pass: any) => (
                <View key={pass.id} style={[styles.regCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.regInfoCol}>
                    <Text style={[styles.regStudentName, { color: textCol }]}>{pass.attendee_name || 'Attendee'}</Text>
                    <Text style={[styles.regSub, { color: subCol }]}>{pass.pass_code} • {pass.status}</Text>
                  </View>
                  <Text style={[styles.statusChipText, { color: pass.consent_status === 'CONSENTED' ? '#10B981' : '#F59E0B' }]}>
                    {pass.consent_status || 'No consent'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* ======================= TAB: ATTENDANCE ======================= */}
        {activeTab === 'ATTENDANCE' && (
          <View>
            <Text style={[styles.tabSectionTitle, { color: textCol }]}>Live Attendance</Text>
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.metricVal, { color: textCol }]}>{attendance?.summary?.total_registered || 0}</Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Registered</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>{attendance?.summary?.present_count || 0}</Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Present</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.metricVal, { color: '#EF4444' }]}>{attendance?.summary?.missing_count || 0}</Text>
                <Text style={[styles.metricLabel, { color: subCol }]}>Missing</Text>
              </View>
            </View>
            {(attendance?.roster || []).slice(0, 200).map((row: any) => (
              <View key={row.registration_id || row.student_id} style={[styles.regCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.regInfoCol}>
                  <Text style={[styles.regStudentName, { color: textCol }]}>{row.student_name}</Text>
                  <Text style={[styles.regSub, { color: subCol }]}>{row.class_name} • {row.attendance_status}</Text>
                </View>
                {row.attendance_status === 'UNMARKED' && (
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: '#10B981' }]}
                    onPress={async () => {
                      await eventService.markAttendanceManual(id, { studentId: row.student_id, status: 'PRESENT' });
                      loadData();
                    }}
                  >
                    <Text style={styles.smallActionBtnText}>Present</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ======================= TAB: CLOSURE ======================= */}
        {activeTab === 'CLOSURE' && (
          <View style={[styles.closureBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="document-text" size={40} color="#6366F1" style={{ marginBottom: 10 }} />
            <Text style={[styles.closureTitle, { color: textCol }]}>Executive Final Report</Text>
            <Text style={[styles.closureDesc, { color: subCol }]}>
              Generates the complete multi-module closure audit including total attendance turnout, verified budgets,
              parent feedback analytics, and safety compliance.
            </Text>
            <TouchableOpacity
              style={styles.generateReportBtn}
              onPress={() => router.push(`/admin/events/${id}/report`)}
            >
              <Text style={styles.generateReportText}>Open Final Executive Report</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerTitleWrap: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  reportBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroLeft: { flex: 1, marginRight: 12 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateChipText: { fontSize: 11 },
  heroVenue: { fontSize: 12, marginTop: 2 },
  readinessCard: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessScoreNum: { fontSize: 18, fontWeight: '900' },
  readinessScoreTitle: { fontSize: 7, fontWeight: '800', marginTop: 1 },
  tabsBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(150,150,150,0.08)',
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  badgeCount: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeCountText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  scrollBody: { padding: 16, paddingBottom: 60 },
  actionsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: {
    width: '48.5%',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  metricVal: { fontSize: 20, fontWeight: '900', marginVertical: 4 },
  metricLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  sectionBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionSubtitle: { fontSize: 11, marginTop: 2, marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkText: { fontSize: 12, fontWeight: '600' },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabSectionTitle: { fontSize: 14, fontWeight: '800' },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallActionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  regCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  regInfoCol: { flex: 1 },
  regStudentName: { fontSize: 13, fontWeight: '800' },
  regSub: { fontSize: 11, marginTop: 2 },
  regStatusCol: { alignItems: 'flex-end', gap: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  promoteBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoteBtnText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  consentBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  consentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consentTitle: { fontSize: 13, fontWeight: '800' },
  consentPct: { fontSize: 13, fontWeight: '900' },
  progressOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(150,150,150,0.15)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressInner: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  consentStatsStrip: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { fontSize: 11 },
  consentCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  consentCardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  medicalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(236,72,153,0.08)',
    padding: 8,
    borderRadius: 8,
  },
  medicalText: { fontSize: 11, fontWeight: '600' },
  busCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  busHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  busIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busTitle: { fontSize: 13, fontWeight: '800' },
  busSub: { fontSize: 11, marginTop: 2 },
  busRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  busRouteText: { fontSize: 11 },
  taskCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 13, fontWeight: '800' },
  taskPriorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  taskPriorityText: { fontSize: 9, fontWeight: '800' },
  taskDesc: { fontSize: 11, marginVertical: 4 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  taskAssignee: { fontSize: 10 },
  taskStatusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  taskStatusText: { fontSize: 9, fontWeight: '800' },
  budgetSummaryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  budgetNum: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  budgetLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  expensePayee: { fontSize: 13, fontWeight: '800' },
  expenseCat: { fontSize: 10, marginTop: 1 },
  expenseAmount: { fontSize: 14, fontWeight: '900' },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  rankPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { color: '#6366F1', fontSize: 13, fontWeight: '900' },
  houseName: { fontSize: 13, fontWeight: '800' },
  medalCount: { fontSize: 11, marginTop: 2 },
  housePoints: { fontSize: 15, fontWeight: '900' },
  emptyTabBox: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyTabText: { fontSize: 13, marginTop: 8 },
  incidentCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  incTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incType: { fontSize: 13, fontWeight: '800' },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  severityText: { fontSize: 9, fontWeight: '800' },
  incDesc: { fontSize: 11, marginTop: 4 },
  closureBox: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  closureTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  closureDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  generateReportBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  generateReportText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  centerLoader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerLoaderText: { fontSize: 13, marginTop: 10 },
  errorTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
