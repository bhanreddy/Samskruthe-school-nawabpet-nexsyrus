import React, { useCallback, useEffect, useState } from 'react';
import AppTextInput from '@/src/components/AppTextInput';
import {
  View, Text, StyleSheet, Pressable, FlatList, Modal, ScrollView,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AdminHeader from '../../components/AdminHeader';
import { useAccountsWebChrome } from '../../contexts/AccountsWebChromeContext';
import LogoLoader from '../../components/LogoLoader';
import { useTheme } from '../../hooks/useTheme';
import { usePermissions } from '../../hooks/usePermissions';
import { FineService } from '../../services/fineService';
import { StudentService } from '../../services/studentService';
import { APIError } from '../../services/apiClient';
import { alertCompat } from '../../utils/crossPlatformAlert';
import type { Fine, FineCategory, FinePolicy, FineStats, FineStatus } from '../../types/fines';
import { FINE_STATUS_LABELS } from '../../types/fines';
import type { Student } from '../../types/models';

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const TABS = ['Dashboard', 'Transactions', 'Approvals', 'Policies', 'Waivers', 'Disputes', 'Reports'] as const;
type Tab = typeof TABS[number];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E' },
  POSTED: { bg: '#FEE2E2', text: '#991B1B' },
  PARTIALLY_PAID: { bg: '#FFEDD5', text: '#9A3412' },
  PAID: { bg: '#D1FAE5', text: '#065F46' },
  WAIVED: { bg: '#E0E7FF', text: '#3730A3' },
  PARTIALLY_WAIVED: { bg: '#DBEAFE', text: '#1E40AF' },
  CANCELLED: { bg: '#F1F5F9', text: '#475569' },
  REJECTED: { bg: '#F1F5F9', text: '#64748B' },
  DISPUTED: { bg: '#FCE7F3', text: '#9D174D' },
};

function StatusChip({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.POSTED;
  return (
    <View style={[st.chip, { backgroundColor: c.bg }]}>
      <Text style={[st.chipText, { color: c.text }]}>{FINE_STATUS_LABELS[status as FineStatus] || status}</Text>
    </View>
  );
}

export default function FinesAccountsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { shellActive, openMobileNav } = useAccountsWebChrome();
  const { hasAnyPermission } = usePermissions();
  const canCreate = hasAnyPermission(['fine.create', 'fees.manage']);
  const canApprove = hasAnyPermission(['fine.approve', 'approvals.manage']);
  const canWaive = hasAnyPermission(['fine.waive', 'fees.manage']);

  const [tab, setTab] = useState<Tab>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FineStats | null>(null);
  const [fines, setFines] = useState<Fine[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categories, setCategories] = useState<FineCategory[]>([]);
  const [policies, setPolicies] = useState<FinePolicy[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    const [s, cats, pols] = await Promise.all([
      FineService.getStats(),
      FineService.getCategories(),
      FineService.getPolicies(),
    ]);
    setStats(s);
    setCategories(Array.isArray(cats) ? cats : []);
    setPolicies(Array.isArray(pols) ? pols : []);
  }, []);

  const loadFines = useCallback(async (page = 1) => {
    const res = await FineService.listFines({
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit: 25,
    });
    setFines(res?.data || []);
    setMeta(res?.meta || { total: 0, page: 1, limit: 25, total_pages: 1 });
  }, [search, statusFilter]);

  const boot = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadDashboard(), loadFines(1)]);
    } catch {
      // FineService alerts on error
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadFines]);

  useEffect(() => { boot(); }, []);

  useEffect(() => {
    if (tab === 'Transactions' || tab === 'Approvals') {
      const status = tab === 'Approvals' ? 'PENDING_APPROVAL' : statusFilter;
      FineService.listFines({
        search: search || undefined,
        status: tab === 'Approvals' ? 'PENDING_APPROVAL' : (status || undefined),
        page: 1,
        limit: 25,
      }).then((res) => {
        setFines(res?.data || []);
        setMeta(res?.meta || { total: 0, page: 1, limit: 25, total_pages: 1 });
      }).catch(() => {});
    }
  }, [tab, search, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await boot();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[st.root, { backgroundColor: theme.colors.background }]}>
        {!shellActive && <AdminHeader title="Fines & Adjustments" showMenuButton onMenuPress={openMobileNav} />}
        <View style={st.center}><LogoLoader size={56} /></View>
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: theme.colors.background }]}>
      {!shellActive && (
        <AdminHeader
          title="Fine, Penalty & Adjustments"
          showBackButton
          showMenuButton
          onMenuPress={openMobileNav}
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.tabs}
      >
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && st.tabActive]}>
            <Text style={[st.tabText, tab === t && st.tabTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'Dashboard' && (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={st.grid}>
            {[
              { label: 'Generated', value: fmtINR(stats?.total_generated || 0), color: '#D97706' },
              { label: 'Collected', value: fmtINR(stats?.total_collected || 0), color: '#059669' },
              { label: 'Outstanding', value: fmtINR(stats?.total_outstanding || 0), color: '#DC2626' },
              { label: 'Waived', value: fmtINR(stats?.total_waived || 0), color: '#4F46E5' },
              { label: 'Pending approval', value: String(stats?.pending_approvals_count || 0), color: '#B45309' },
              { label: 'Disputed', value: String(stats?.active_disputes_count || 0), color: '#BE185D' },
              { label: 'Cancelled', value: String(stats?.cancelled_count || 0), color: '#64748B' },
              { label: 'Collection %', value: `${stats?.collection_percentage || 0}%`, color: '#0EA5E9' },
            ].map((card) => (
              <View key={card.label} style={st.statCard}>
                <Text style={[st.statValue, { color: card.color }]}>{card.value}</Text>
                <Text style={st.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
          {canCreate && (
            <Pressable style={st.primaryBtn} onPress={() => setCreateOpen(true)}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={st.primaryBtnText}>Create Fine</Text>
            </Pressable>
          )}
          <Text style={st.sectionTitle}>Recent transactions</Text>
          {(fines || []).slice(0, 8).map((item) => (
            <FineRow key={item.id} item={item} onPress={() => router.push(`/accounts/fines/${item.id}` as never)} />
          ))}
          {fines.length === 0 && (
            <Empty text="No fines have been posted yet. Create a manual fine or wait for automatic late fees." />
          )}
        </ScrollView>
      )}

      {(tab === 'Transactions' || tab === 'Approvals') && (
        <View style={{ flex: 1 }}>
          <View style={st.searchRow}>
            <AppTextInput
              style={st.search}
              placeholder="Search name, admission no, fine ID…"
              value={search}
              onChangeText={setSearch}
            />
            {canCreate && tab === 'Transactions' && (
              <Pressable style={st.iconBtn} onPress={() => setCreateOpen(true)}>
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            )}
            <Pressable style={st.iconBtnGhost} onPress={() => FineService.exportFines().catch(() => {})}>
              <Ionicons name="download-outline" size={20} color="#0F172A" />
            </Pressable>
          </View>
          {tab === 'Transactions' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
              {['', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'DISPUTED', 'CANCELLED'].map((s) => (
                <Pressable key={s || 'all'} onPress={() => setStatusFilter(s)} style={[st.filterChip, statusFilter === s && st.filterChipOn]}>
                  <Text style={[st.filterChipText, statusFilter === s && { color: '#fff' }]}>{s ? FINE_STATUS_LABELS[s as FineStatus] : 'All'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <FlatList
            data={fines}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <FineRow item={item} onPress={() => router.push(`/accounts/fines/${item.id}` as never)} />
            )}
            ListEmptyComponent={
              <Empty
                text={tab === 'Approvals'
                  ? 'No pending fine requests. Requests raised by teachers will appear here.'
                  : 'No outstanding fines match these filters.'}
              />
            }
          />
          <Text style={st.pageHint}>Page {meta.page} of {meta.total_pages} · {meta.total} records</Text>
        </View>
      )}

      {tab === 'Policies' && (
        <PoliciesTab categories={categories} policies={policies} canManage={canCreate} onReload={loadDashboard} />
      )}
      {tab === 'Waivers' && <WaiversTab />}
      {tab === 'Disputes' && <DisputesTab canResolve={canApprove || canWaive} />}
      {tab === 'Reports' && <ReportsTab />}

      <CreateFineModal
        visible={createOpen}
        categories={categories}
        policies={policies}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); boot(); }}
      />
    </View>
  );
}

function FineRow({ item, onPress }: { item: Fine; onPress: () => void }) {
  return (
    <Pressable style={st.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle}>{item.student_name || 'Student'}</Text>
        <Text style={st.rowMeta}>
          {item.fine_no} · {item.admission_no || item.student_admission_no || '—'}
          {item.class_name ? ` · ${item.class_name} ${item.section_name || ''}` : ''}
        </Text>
        <Text style={st.rowCat}>{item.category_name} · {item.source_type || 'MANUAL'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={st.rowAmt}>{fmtINR(Number(item.outstanding_amount))}</Text>
        <StatusChip status={item.status} />
      </View>
    </Pressable>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={st.empty}>
      <Ionicons name="shield-checkmark-outline" size={36} color="#94A3B8" />
      <Text style={st.emptyText}>{text}</Text>
    </View>
  );
}

function CreateFineModal({
  visible, categories, policies, onClose, onCreated,
}: {
  visible: boolean;
  categories: FineCategory[];
  policies: FinePolicy[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [policyId, setPolicyId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPolicy = policies.find((p) => p.id === policyId);

  useEffect(() => {
    if (query.length < 2) { setMatches([]); return; }
    const t = setTimeout(() => {
      StudentService.getAll<Student>({ search: query, limit: 8 }).then((page) => {
        setMatches(page?.data || []);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!selectedPolicy) return;
    if (selectedPolicy.calculation_type === 'FIXED' && selectedPolicy.fixed_amount) {
      setAmount(String(selectedPolicy.fixed_amount));
    }
  }, [selectedPolicy]);

  const submit = async (confirmDuplicate = false) => {
    if (!student || !categoryId || !reason || !Number(amount)) {
      alertCompat('Missing details', 'Select a student, category, amount and reason.');
      return;
    }
    setSaving(true);
    try {
      await FineService.createFine({
        student_id: student.id,
        category_id: categoryId,
        policy_id: policyId || null,
        amount: Number(amount),
        reason,
        internal_note: note || null,
        confirm_duplicate: confirmDuplicate,
      });
      alertCompat('Fine posted', 'The parent will be notified and the student ledger updated.');
      onCreated();
    } catch (err) {
      if (err instanceof APIError && err.status === 409) {
        alertCompat('Possible duplicate', 'A similar fine exists for this student today. Create anyway?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create anyway', onPress: () => submit(true) },
        ]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={st.modalBackdrop}>
        <View style={st.modal}>
          <Text style={st.modalTitle}>Create Fine</Text>
          <ScrollView>
            <AppTextInput placeholder="Search student name / admission no" value={student ? `${student.display_name || student.first_name} (${student.admission_no})` : query} onChangeText={(v) => { setStudent(null); setQuery(v); }} style={st.input} />
            {matches.map((s) => (
              <Pressable key={s.id} style={st.match} onPress={() => { setStudent(s); setQuery(''); setMatches([]); }}>
                <Text style={st.rowTitle}>{s.display_name || `${s.first_name} ${s.last_name}`}</Text>
                <Text style={st.rowMeta}>{s.admission_no}</Text>
              </Pressable>
            ))}
            <Text style={st.label}>Category</Text>
            <ScrollView horizontal>
              {categories.filter((c) => c.active).map((c) => (
                <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[st.filterChip, categoryId === c.id && st.filterChipOn]}>
                  <Text style={[st.filterChipText, categoryId === c.id && { color: '#fff' }]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={st.label}>Policy (optional)</Text>
            {policies.filter((p) => !categoryId || p.category_id === categoryId).map((p) => (
              <Pressable key={p.id} onPress={() => setPolicyId(p.id)} style={[st.match, policyId === p.id && { borderColor: '#D97706' }]}>
                <Text style={st.rowTitle}>{p.name}</Text>
                <Text style={st.rowMeta}>{p.calculation_type}{p.fixed_amount ? ` · ${fmtINR(Number(p.fixed_amount))}` : ''}{p.per_day_amount ? ` · ${fmtINR(Number(p.per_day_amount))}/day` : ''}</Text>
              </Pressable>
            ))}
            <AppTextInput placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} style={st.input} />
            <AppTextInput placeholder="Reason (visible to parent)" value={reason} onChangeText={setReason} style={st.input} />
            <AppTextInput placeholder="Internal note (staff only)" value={note} onChangeText={setNote} style={st.input} />
          </ScrollView>
          <View style={st.modalActions}>
            <Pressable onPress={onClose}><Text style={st.link}>Cancel</Text></Pressable>
            <Pressable style={st.primaryBtn} onPress={() => submit(false)} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryBtnText}>Post Fine</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PoliciesTab({ categories, policies, canManage, onReload }: { categories: FineCategory[]; policies: FinePolicy[]; canManage: boolean; onReload: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      {canManage && (
        <View style={st.card}>
          <Text style={st.sectionTitle}>New category</Text>
          <AppTextInput placeholder="Name" value={name} onChangeText={setName} style={st.input} />
          <AppTextInput placeholder="Code (e.g. LAB_DAMAGE)" value={code} onChangeText={setCode} style={st.input} />
          <Pressable style={st.primaryBtn} onPress={async () => {
            if (!name || !code) return;
            await FineService.createCategory({ name, code });
            setName(''); setCode('');
            onReload();
          }}>
            <Text style={st.primaryBtnText}>Add category</Text>
          </Pressable>
        </View>
      )}
      <Text style={st.sectionTitle}>Categories</Text>
      {categories.map((c) => (
        <View key={c.id} style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>{c.name}</Text>
            <Text style={st.rowMeta}>{c.code} · {c.active ? 'Active' : 'Inactive'}</Text>
          </View>
          {canManage && (
            <Pressable onPress={async () => { await FineService.updateCategory(c.id, { active: !c.active }); onReload(); }}>
              <Text style={st.link}>{c.active ? 'Deactivate' : 'Activate'}</Text>
            </Pressable>
          )}
        </View>
      ))}
      <Text style={st.sectionTitle}>Policies</Text>
      {policies.map((p) => (
        <View key={p.id} style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>{p.name}</Text>
            <Text style={st.rowMeta}>{p.category_name} · {p.calculation_type} · {p.auto_apply ? 'Auto' : 'Manual'}{p.approval_required ? ' · Approval required' : ''}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function WaiversTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    FineService.listWaivers({ limit: 50 }).then((r) => setRows(r?.data || [])).catch(() => {});
  }, []);
  if (!rows.length) return <Empty text="No waivers recorded yet." />;
  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>{item.student_name}</Text>
            <Text style={st.rowMeta}>{item.fine_no} · {item.reason}</Text>
          </View>
          <Text style={st.rowAmt}>{fmtINR(Number(item.amount))}</Text>
        </View>
      )}
    />
  );
}

function DisputesTab({ canResolve }: { canResolve: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => FineService.listDisputes({ status: 'OPEN' }).then((r) => setRows(r?.data || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  if (!rows.length) return <Empty text="No open parent review requests." />;
  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <View style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>{item.student_name}</Text>
            <Text style={st.rowMeta}>{item.fine_no} · {item.reason_type || item.reason}</Text>
            <Text style={st.rowCat}>{item.message}</Text>
          </View>
          {canResolve && (
            <Pressable onPress={async () => {
              await FineService.resolveDispute(item.id, { resolution_action: 'DISMISSED', resolution_note: 'Reviewed and upheld' });
              load();
            }}>
              <Text style={st.link}>Dismiss</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}

function ReportsTab() {
  const [aging, setAging] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => {
    FineService.getAgingReport().then(setAging).catch(() => {});
    FineService.getCategoryReport().then((r) => setCats(Array.isArray(r) ? r : [])).catch(() => {});
  }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={st.sectionTitle}>Aging</Text>
      {aging && Object.entries(aging).map(([k, v]: any) => (
        <View key={k} style={st.row}>
          <Text style={st.rowTitle}>{v.label || k}</Text>
          <Text style={st.rowAmt}>{v.count} · {fmtINR(v.total_amount || 0)}</Text>
        </View>
      ))}
      <Text style={st.sectionTitle}>By category</Text>
      {cats.map((c) => (
        <View key={c.category_id} style={st.row}>
          <View style={{ flex: 1 }}>
            <Text style={st.rowTitle}>{c.category_name}</Text>
            <Text style={st.rowMeta}>{c.fines_count || 0} fines</Text>
          </View>
          <Text style={st.rowAmt}>{fmtINR(Number(c.total_outstanding || 0))}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEF2FF' },
  tabActive: { backgroundColor: '#D97706' },
  tabText: { fontWeight: '700', color: '#334155', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { marginTop: 4, color: '#64748B', fontWeight: '600', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginHorizontal: 16, marginTop: 8 },
  row: { marginHorizontal: 12, marginVertical: 6, backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  rowTitle: { fontWeight: '800', color: '#0F172A', fontSize: 15 },
  rowMeta: { color: '#64748B', marginTop: 2, fontSize: 12 },
  rowCat: { color: '#92400E', marginTop: 4, fontSize: 12, fontWeight: '600' },
  rowAmt: { fontWeight: '800', color: '#0F172A' },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { textAlign: 'center', color: '#64748B', maxWidth: 320 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  search: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 8 },
  iconBtn: { backgroundColor: '#D97706', width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBtnGhost: { backgroundColor: '#fff', width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  filterChipOn: { backgroundColor: '#D97706', borderColor: '#D97706' },
  filterChipText: { fontWeight: '700', fontSize: 12, color: '#334155' },
  pageHint: { textAlign: 'center', color: '#94A3B8', padding: 8, fontSize: 12 },
  primaryBtn: { margin: 16, backgroundColor: '#D97706', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginVertical: 6 },
  match: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6, color: '#334155' },
  link: { color: '#D97706', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
});
