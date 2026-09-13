import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AppTextInput from './AppTextInput';
import { usePermissions } from '../hooks/usePermissions';
import { useFeatures } from '../hooks/useFeatures';
import { alertCompat } from '../utils/crossPlatformAlert';
import {
  FeeRecoveryService,
  FeeRecoveryOverview,
  FeeDefaulterItem,
  AutomationRuleConfig,
} from '../services/feeRecoveryService';

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const AGEING_KEYS = [
  { key: 'all', label: 'All' },
  { key: 'current', label: 'Current' },
  { key: '1-7 days', label: '1–7d' },
  { key: '8-30 days', label: '8–30d' },
  { key: '31-60 days', label: '31–60d' },
  { key: '61-90 days', label: '61–90d' },
  { key: '90+ days', label: '90+d' },
] as const;

export default function FeeRecoveryView({
  onSelectStudent,
}: {
  onSelectStudent?: (studentId: string) => void;
}) {
  const { hasPermission } = usePermissions();
  const { isEnabled, loading: featuresLoading } = useFeatures();
  const canManage = hasPermission('fees.manage');
  const canView = hasPermission('fees.view') && isEnabled('nav.fees');
  const requestId = useRef(0);
  const sendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyStudent, setHistoryStudent] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FeeRecoveryOverview | null>(null);
  const [defaulters, setDefaulters] = useState<FeeDefaulterItem[]>([]);
  const [selectedAgeing, setSelectedAgeing] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  // Automation rule modal
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [ruleConfig, setRuleConfig] = useState<AutomationRuleConfig | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  const loadData = useCallback(async () => {
    if (!canView || featuresLoading) return;
    const currentRequest = ++requestId.current;
    try {
      setLoading(true);
      setError(null);
      const [ov, defs, rules] = await Promise.all([
        FeeRecoveryService.getOverview(),
        FeeRecoveryService.getDefaulters({
          ageing_stage: selectedAgeing === 'all' ? undefined : selectedAgeing,
          search: searchQuery.trim() || undefined,
          limit: 50,
          page,
        }),
        canManage ? FeeRecoveryService.getRules() : Promise.resolve(null),
      ]);
      if (currentRequest !== requestId.current) return;
      setTotalPages(defs.pagination.total_pages);
      setOverview(ov);
      setDefaulters(defs.data || []);
      if (rules) setRuleConfig(rules);
    } catch (err: any) {
      if (currentRequest === requestId.current) setError(err?.message || 'Failed to load fee recovery data');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [selectedAgeing, searchQuery, page, canView, canManage, featuresLoading]);

  useEffect(() => {
    setSelectedIds(new Set());
    const requests = requestId;
    const timer = setTimeout(() => { void loadData(); }, 250);
    return () => { clearTimeout(timer); requests.current++; };
  }, [loadData]);

  const toggleSelectStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === defaulters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(defaulters.map((d) => d.student_id)));
    }
  };

  const selectedTotal = useMemo(() => {
    return defaulters
      .filter((d) => selectedIds.has(d.student_id))
      .reduce((acc, d) => acc + d.total_outstanding, 0);
  }, [defaulters, selectedIds]);

  const handleSendBatch = async () => {
    if (selectedIds.size === 0 || sendingRef.current || !canManage) return;
    sendingRef.current = true;
    try {
      setSending(true);
      const ids = Array.from(selectedIds);
      const result = await FeeRecoveryService.sendReminders(ids, customMsg.trim() || undefined);
      setConfirmModalVisible(false);
      setCustomMsg('');
      setSelectedIds(new Set());
      alertCompat(
        'Reminder Results',
        `Sent: ${result.dispatched_count}. Skipped: ${result.skipped_count}. Failed or uncertain: ${result.error_count}. Check reminder history before retrying.`
      );
      loadData();
    } catch (err: any) {
      alertCompat('Dispatch Failed', err?.message || 'Could not send reminders');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const toggleRuleEnabled = async () => {
    if (!ruleConfig || savingRule || !canManage) return;
    try {
      setSavingRule(true);
      const updated = await FeeRecoveryService.updateRules({
        is_enabled: !ruleConfig.is_enabled,
      });
      setRuleConfig(updated);
      alertCompat(
        'Automation Updated',
        `Automated fee recovery reminders are now ${updated.is_enabled ? 'ENABLED' : 'DISABLED'}.`
      );
    } catch (err: any) {
      alertCompat('Update Failed', err?.message || 'Failed to update rule');
    } finally {
      setSavingRule(false);
    }
  };

  const showHistory = async (studentId: string, nextPage = 1) => {
    try {
      const rows = await FeeRecoveryService.getReminderHistory(studentId, nextPage, 20);
      setHistory(rows); setHistoryStudent(studentId); setHistoryPage(nextPage);
    } catch (err: any) { alertCompat('History unavailable', err?.message || 'Please retry'); }
  };

  if (!featuresLoading && !canView) return <View style={s.center}><Text>Fee recovery is unavailable for this account or school.</Text></View>;
  if (error && !overview) return <View style={s.center}><Text accessibilityRole="alert">{error}</Text><TouchableOpacity onPress={loadData}><Text>Retry</Text></TouchableOpacity></View>;
  if ((loading || featuresLoading) && !overview) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={s.loadingText}>Loading recovery intelligence…</Text>
      </View>
    );
  }

  const sSummary = overview?.summary;
  const buckets = overview?.ageing_buckets;

  return (
    <View style={s.container}>
      <FlatList
        ListHeaderComponent={<>
        {error && <Text accessibilityRole="alert">{error} — showing previously loaded data.</Text>}
        {loading && <ActivityIndicator accessibilityLabel="Refreshing recovery data" />}
      {/* 1. Header with Automation Settings Button */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>Fee Recovery Intelligence</Text>
          <Text style={s.subtitle}>Assigned standard fees · active students · excludes transport</Text>
        </View>
        {canManage && <TouchableOpacity
          style={[s.automationBtn, ruleConfig?.is_enabled && s.automationBtnActive]}
          onPress={() => setRuleModalVisible(true)}
        >
          <Ionicons
            name={ruleConfig?.is_enabled ? 'flash' : 'flash-outline'}
            size={16}
            color={ruleConfig?.is_enabled ? '#10B981' : '#64748B'}
          />
          <Text style={[s.automationBtnText, ruleConfig?.is_enabled && s.automationBtnTextActive]}>
            {ruleConfig?.is_enabled ? 'Auto: ON' : 'Auto: OFF'}
          </Text>
        </TouchableOpacity>}
      </View>

      {/* 2. Executive KPI Cards */}
      <View style={s.kpiGrid}>
        <View style={[s.kpiCard, { borderColor: '#E2E8F0' }]}>
          <Text style={s.kpiLabel}>Total Expected</Text>
          <Text style={s.kpiVal}>{fmtINR(sSummary?.total_expected || 0)}</Text>
        </View>
        <View style={[s.kpiCard, { borderColor: '#BBF7D0' }]}>
          <Text style={[s.kpiLabel, { color: '#166534' }]}>Collected</Text>
          <Text style={[s.kpiVal, { color: '#16a34a' }]}>{fmtINR(sSummary?.total_collected || 0)}</Text>
        </View>
        <View style={[s.kpiCard, { borderColor: '#FECDD3' }]}>
          <Text style={[s.kpiLabel, { color: '#9F1239' }]}>Outstanding Dues</Text>
          <Text style={[s.kpiVal, { color: '#E11D48' }]}>{fmtINR(sSummary?.total_outstanding || 0)}</Text>
        </View>
        <View style={[s.kpiCard, { borderColor: '#E0E7FF' }]}>
          <Text style={[s.kpiLabel, { color: '#3730A3' }]}>Recovery Rate</Text>
          <Text style={[s.kpiVal, { color: '#4F46E5' }]}>{sSummary?.collection_efficiency || 0}%</Text>
        </View>
      </View>

      {/* 3. Ageing Buckets Filter Chips */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Overdue Ageing Buckets</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bucketScroll}>
        {AGEING_KEYS.map((b) => {
          const isActive = selectedAgeing === b.key;
          let count = 0;
          let amount = 0;
          if (b.key === 'current' && buckets?.current) {
            count = buckets.current.count;
            amount = buckets.current.amount;
          } else if (b.key === '1-7 days' && buckets?.days_1_7) {
            count = buckets.days_1_7.count;
            amount = buckets.days_1_7.amount;
          } else if (b.key === '8-30 days' && buckets?.days_8_30) {
            count = buckets.days_8_30.count;
            amount = buckets.days_8_30.amount;
          } else if (b.key === '31-60 days' && buckets?.days_31_60) {
            count = buckets.days_31_60.count;
            amount = buckets.days_31_60.amount;
          } else if (b.key === '61-90 days' && buckets?.days_61_90) {
            count = buckets.days_61_90.count;
            amount = buckets.days_61_90.amount;
          } else if (b.key === '90+ days' && buckets?.days_90_plus) {
            count = buckets.days_90_plus.count;
            amount = buckets.days_90_plus.amount;
          }

          return (
            <TouchableOpacity
              key={b.key}
              style={[s.bucketChip, isActive && s.bucketChipActive]}
              onPress={() => { setPage(1); setSelectedAgeing(b.key); }}
            >
              <Text style={[s.bucketLabel, isActive && s.bucketLabelActive]}>{b.label}</Text>
              {b.key !== 'all' && (
                <Text style={[s.bucketAmount, isActive && s.bucketAmountActive]}>
                  {fmtINR(amount)} ({count})
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Search and Select All Row */}
      <View style={s.filterRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <AppTextInput
            style={s.searchInput}
            placeholder="Search student or admission no…"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={(value) => { setPage(1); setSearchQuery(value); }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {canManage && defaulters.length > 0 && (
          <TouchableOpacity style={s.selectAllBtn} onPress={selectAll}>
            <Ionicons
              name={selectedIds.size === defaulters.length ? 'checkbox' : 'square-outline'}
              size={18}
              color="#3B82F6"
            />
            <Text style={s.selectAllText}>
              {selectedIds.size === defaulters.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      </>}
        data={defaulters}
        refreshing={loading}
        onRefresh={loadData}
        ListFooterComponent={<View style={s.modalBtnRow}>
          <TouchableOpacity accessibilityRole="button" disabled={page <= 1 || loading} onPress={() => setPage(p => p - 1)}><Text>Previous</Text></TouchableOpacity>
          <Text>Page {page} of {totalPages}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={page >= totalPages || loading} onPress={() => setPage(p => p + 1)}><Text>Next</Text></TouchableOpacity>
        </View>}
        keyExtractor={(item) => item.student_id}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={s.emptyTitle}>No Defaulters in this view</Text>
            <Text style={s.emptySub}>All accounts are clear or match no filter criteria.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.student_id);
          const segColor =
            item.segmentation === 'new'
              ? '#0D9488'
              : item.segmentation === 'repeat'
              ? '#D97706'
              : '#E11D48';

          return (
            <Pressable
              style={[s.defaulterCard, isSelected && s.defaulterCardSelected]}
              onPress={() => canManage && toggleSelectStudent(item.student_id)}
            >
              <View style={s.cardTop}>
                {canManage && <TouchableOpacity
                  style={s.checkWrap}
                  onPress={() => canManage && toggleSelectStudent(item.student_id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? '#3B82F6' : '#94A3B8'}
                  />
                </TouchableOpacity>}

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View style={s.nameRow}>
                    <Text accessibilityRole="link" style={s.studentName} onPress={() => onSelectStudent?.(item.student_id)}>{item.student_name}</Text>
                    <View style={[s.segBadge, { borderColor: segColor, backgroundColor: `${segColor}15` }]}>
                      <Text style={[s.segText, { color: segColor }]}>
                        {item.segmentation === 'persistent' ? '30+ DAYS LATE' : item.segmentation === 'repeat' ? 'MULTIPLE OVERDUE FEES' : 'NEW'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.metaText}>
                    Class {item.class_name}-{item.section_name} · Adm: {item.admission_no}
                  </Text>
                </View>

                <View style={s.amountWrap}>
                  <Text style={s.dueAmount}>{fmtINR(item.total_outstanding)}</Text>
                  <Text style={s.overdueBadge}>{item.days_overdue > 0 ? `${item.days_overdue}d overdue` : 'Current'}</Text>
                </View>
              </View>

              <View style={s.cardBottom}>
                <View style={s.parentInfo}>
                  <Feather name="phone" size={12} color="#64748B" />
                  <Text style={s.parentText}>
                    {item.parent_contact?.phone || 'No phone'} · {item.parent_contact?.parent_name || 'Parent'}
                  </Text>
                </View>

                <View style={s.actionsRight}>
                  <TouchableOpacity onPress={() => showHistory(item.student_id)}><Text style={s.singleRemindText}>History</Text></TouchableOpacity>
                  {item.last_reminder && (
                    <Text style={s.reminderHistoryText}>
                      Sent {new Date(item.last_reminder.sent_at).toLocaleDateString()}
                    </Text>
                  )}
                  {canManage && <TouchableOpacity
                    style={s.singleRemindBtn}
                    onPress={() => {
                      setSelectedIds(new Set([item.student_id]));
                      setConfirmModalVisible(true);
                    }}
                  >
                    <Ionicons name="paper-plane-outline" size={14} color="#3B82F6" />
                    <Text style={s.singleRemindText}>Remind</Text>
                  </TouchableOpacity>}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Floating Action Bar when students selected */}
      {canManage && selectedIds.size > 0 && (
        <View style={s.floatingBar}>
          <View>
            <Text style={s.floatingCount}>{selectedIds.size} student(s) selected</Text>
            <Text style={s.floatingTotal}>Total: {fmtINR(selectedTotal)}</Text>
          </View>
          <TouchableOpacity
            style={s.floatingSendBtn}
            onPress={() => setConfirmModalVisible(true)}
          >
            <Ionicons name="notifications" size={16} color="#FFF" />
            <Text style={s.floatingSendText}>Send Reminders</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => !sending && setConfirmModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Confirm Fee Reminders</Text>
            <Text style={s.modalSubtitle}>
              You are about to dispatch push notifications to parents.
            </Text>

            <View style={s.modalSummaryBox}>
              <Text style={s.modalSummaryLine}>
                Target Students: <Text style={s.bold}>{selectedIds.size}</Text>
              </Text>
              <Text style={s.modalSummaryLine}>
                Total Outstanding: <Text style={s.bold}>{fmtINR(selectedTotal)}</Text>
              </Text>
              <Text style={s.modalSummaryLine}>
                Channel: <Text style={s.bold}>App push notification</Text>
              </Text>
            </View>

            <AppTextInput
              style={s.customMsgInput}
              placeholder="Optional custom message note for parents…"
              placeholderTextColor="#94A3B8"
              value={customMsg}
              onChangeText={setCustomMsg}
              multiline
              maxLength={500}
            />

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={sending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmSendBtn}
                onPress={handleSendBatch}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.confirmSendText}>Send Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={history !== null} transparent animationType="fade" onRequestClose={() => setHistory(null)}>
        <View style={s.modalOverlay}><View style={s.modalBox}>
          <Text style={s.modalTitle}>Reminder History</Text>
          <ScrollView style={{ maxHeight: 360 }}>{history?.map(row => <View key={row.id} style={{ paddingVertical: 8 }}>
            <Text>{row.status === 'completed' ? 'Accepted by push provider' : row.status} · {row.stage}</Text>
            <Text>{new Date(row.executed_at || row.scheduled_at).toLocaleString()}</Text>
            {!!row.error_summary && <Text>{row.error_summary}</Text>}
          </View>)}</ScrollView>
          {history?.length === 0 && <Text>No reminders on this page.</Text>}
          <View style={s.modalBtnRow}>
            <TouchableOpacity disabled={historyPage <= 1} onPress={() => historyStudent && showHistory(historyStudent, historyPage - 1)}><Text>Newer</Text></TouchableOpacity>
            <TouchableOpacity disabled={(history?.length || 0) < 20} onPress={() => historyStudent && showHistory(historyStudent, historyPage + 1)}><Text>Older</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setHistory(null)}><Text>Close</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
      {/* Automation Rules Configuration Modal */}
      <Modal visible={ruleModalVisible} transparent animationType="fade" onRequestClose={() => setRuleModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Automated Fee Recovery Rules</Text>
            <Text style={s.modalSubtitle}>
              When enabled, SchoolIMS scans for due/overdue fees and sends polite reminders automatically at scheduled stages.
            </Text>

            <View style={s.ruleStatusBox}>
              <Text style={s.ruleStatusLabel}>Automated Cadence:</Text>
              <Text style={s.ruleStatusVal}>
                {ruleConfig ? `${ruleConfig.trigger_config.days_before_due}d before due · due today · ${ruleConfig.trigger_config.overdue_stages.join(', ')}d overdue · ${ruleConfig.trigger_config.cooldown_days}d cooldown` : 'Configuration unavailable'}
              </Text>
            </View>

            <TouchableOpacity
              style={[s.toggleRuleBtn, ruleConfig?.is_enabled ? s.toggleDisable : s.toggleEnable]}
              onPress={toggleRuleEnabled}
              disabled={savingRule}
            >
              {savingRule ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.toggleRuleText}>
                  {ruleConfig?.is_enabled ? 'Turn Automation OFF' : 'Turn Automation ON'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.cancelBtn, { marginTop: 16 }]}
              onPress={() => setRuleModalVisible(false)}
            >
              <Text style={s.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  automationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFF',
  },
  automationBtnActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  automationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  automationBtnTextActive: {
    color: '#16A34A',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  bucketScroll: {
    marginBottom: 14,
  },
  bucketChip: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  bucketChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  bucketLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  bucketLabelActive: {
    color: '#2563EB',
  },
  bucketAmount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bucketAmountActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#0F172A',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  selectAllText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  defaulterCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  defaulterCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFF',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkWrap: {
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  segBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  segText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
  },
  overdueBadge: {
    fontSize: 11,
    color: '#9F1239',
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  parentText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderHistoryText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  singleRemindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  singleRemindText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  floatingTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  floatingSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  floatingSendText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    gap: 4,
  },
  modalSummaryLine: {
    fontSize: 13,
    color: '#334155',
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  customMsgInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginTop: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmSendBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  confirmSendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  ruleStatusBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
  },
  ruleStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  ruleStatusVal: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  toggleRuleBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  toggleEnable: {
    backgroundColor: '#16A34A',
  },
  toggleDisable: {
    backgroundColor: '#DC2626',
  },
  toggleRuleText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
