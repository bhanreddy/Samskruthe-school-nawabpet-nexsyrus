import React, { useCallback, useEffect, useState, useMemo } from 'react';
import AppTextInput from '@/src/components/AppTextInput';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
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
import { Shadows } from '../../theme/themes';

const fmtINR = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const TABS = [
  { id: 'Dashboard', label: 'Dashboard', icon: 'speedometer-outline' as const },
  { id: 'Transactions', label: 'Transactions', icon: 'receipt-outline' as const },
  { id: 'Approvals', label: 'Approvals', icon: 'checkmark-done-circle-outline' as const },
  { id: 'Policies', label: 'Policies', icon: 'shield-checkmark-outline' as const },
  { id: 'Waivers', label: 'Waivers', icon: 'hand-left-outline' as const },
  { id: 'Disputes', label: 'Disputes', icon: 'alert-circle-outline' as const },
  { id: 'Reports', label: 'Reports', icon: 'bar-chart-outline' as const },
] as const;

type Tab = (typeof TABS)[number]['id'];

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING_APPROVAL: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', icon: 'time-outline' },
  POSTED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA', icon: 'alert-circle-outline' },
  PARTIALLY_PAID: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA', icon: 'pie-chart-outline' },
  PAID: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', icon: 'checkmark-circle-outline' },
  WAIVED: { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE', icon: 'gift-outline' },
  PARTIALLY_WAIVED: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', icon: 'gift-outline' },
  CANCELLED: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: 'close-circle-outline' },
  REJECTED: { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0', icon: 'ban-outline' },
  DISPUTED: { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8', icon: 'help-circle-outline' },
};

const getStudentColor = (name?: string) => {
  const colors = [
    { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
    { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD' },
    { bg: '#FAF5FF', text: '#9333EA', border: '#E9D5FF' },
  ];
  if (!name) return colors[0];
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[code % colors.length];
};

const getInitials = (name?: string) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || 'ST').toUpperCase();
};

function StatusChip({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.POSTED;
  const label = FINE_STATUS_LABELS[status as FineStatus] || status;
  return (
    <View style={[st.chip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} style={{ marginRight: 3 }} />
      <Text style={[st.chipText, { color: cfg.text }]}>{label}</Text>
    </View>
  );
}

export default function FinesAccountsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { shellActive, openMobileNav } = useAccountsWebChrome();
  const { hasAnyPermission } = usePermissions();

  const canCreate = hasAnyPermission(['fine.create', 'fees.manage']);
  const canApprove = hasAnyPermission(['fine.approve', 'approvals.manage']);
  const canWaive = hasAnyPermission(['fine.waive', 'fees.manage']);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

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

  const loadFines = useCallback(
    async (page = 1) => {
      const res = await FineService.listFines({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 25,
      });
      setFines(res?.data || []);
      setMeta(res?.meta || { total: 0, page: 1, limit: 25, total_pages: 1 });
    },
    [search, statusFilter],
  );

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

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    if (tab === 'Transactions' || tab === 'Approvals') {
      const targetStatus = tab === 'Approvals' ? 'PENDING_APPROVAL' : statusFilter;
      FineService.listFines({
        search: search || undefined,
        status: targetStatus || undefined,
        page: 1,
        limit: 25,
      })
        .then((res) => {
          setFines(res?.data || []);
          setMeta(res?.meta || { total: 0, page: 1, limit: 25, total_pages: 1 });
        })
        .catch(() => {});
    }
  }, [tab, search, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await boot();
    setRefreshing(false);
  };

  const statCardsData = useMemo(() => {
    return [
      {
        label: 'Total Generated',
        value: fmtINR(stats?.total_generated || 0),
        color: '#D97706',
        bg: '#FEF3C7',
        icon: 'wallet-outline' as const,
        sub: 'Total penalties posted',
      },
      {
        label: 'Collected',
        value: fmtINR(stats?.total_collected || 0),
        color: '#059669',
        bg: '#D1FAE5',
        icon: 'checkmark-circle-outline' as const,
        sub: 'Recovered to date',
      },
      {
        label: 'Outstanding',
        value: fmtINR(stats?.total_outstanding || 0),
        color: '#DC2626',
        bg: '#FEE2E2',
        icon: 'alert-circle-outline' as const,
        sub: 'Pending recovery',
      },
      {
        label: 'Waived',
        value: fmtINR(stats?.total_waived || 0),
        color: '#4F46E5',
        bg: '#EEF2FF',
        icon: 'gift-outline' as const,
        sub: 'Principal approved',
      },
      {
        label: 'Pending Approval',
        value: String(stats?.pending_approvals_count || 0),
        color: '#B45309',
        bg: '#FEF3C7',
        icon: 'time-outline' as const,
        sub: 'Teacher requests awaiting review',
      },
      {
        label: 'Active Disputes',
        value: String(stats?.active_disputes_count || 0),
        color: '#BE185D',
        bg: '#FCE7F3',
        icon: 'chatbubble-ellipses-outline' as const,
        sub: 'Parent objections open',
      },
      {
        label: 'Cancelled / Void',
        value: String(stats?.cancelled_count || 0),
        color: '#64748B',
        bg: '#F1F5F9',
        icon: 'close-circle-outline' as const,
        sub: 'Dismissed or cancelled',
      },
      {
        label: 'Collection Rate',
        value: `${stats?.collection_percentage || 0}%`,
        color: '#0284C7',
        bg: '#E0F2FE',
        icon: 'pie-chart-outline' as const,
        sub: 'Collected vs generated',
        isProgress: true,
        progress: Math.min((stats?.collection_percentage || 0) / 100, 1),
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <View style={[st.root, { backgroundColor: theme.colors.background }]}>
        {!shellActive && (
          <AdminHeader title="Fines & Adjustments" showMenuButton onMenuPress={openMobileNav} />
        )}
        <View style={st.center}>
          <LogoLoader size={56} />
        </View>
      </View>
    );
  }

  const cardWidth = isDesktop ? '23.8%' : isTablet ? '48.5%' : '48%';

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

      {/* Screen Subheader / Action Bar */}
      <View
        style={[
          st.headerBar,
          {
            backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={st.headerTextGroup}>
          <View style={st.headerTitleRow}>
            <View style={st.headerIconBox}>
              <Ionicons name="receipt" size={18} color="#D97706" />
            </View>
            <Text style={[st.headerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Fines & Adjustments
            </Text>
          </View>
          <Text style={[st.headerSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Track disciplinary penalties, fee adjustments, waivers & parent disputes
          </Text>
        </View>

        <View style={st.headerActionRow}>
          {canCreate && (
            <Pressable
              style={({ hovered }: any) => [
                st.actionBtnPrimary,
                hovered && st.actionBtnPrimaryHover,
              ]}
              onPress={() => setCreateOpen(true)}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={st.actionBtnPrimaryText}>Create Fine</Text>
            </Pressable>
          )}

          <Pressable
            style={({ hovered }: any) => [
              st.actionBtnGhost,
              hovered && st.actionBtnGhostHover,
              isDark && st.actionBtnGhostDark,
            ]}
            onPress={() => FineService.exportFines().catch(() => {})}
            hitSlop={6}
          >
            <Ionicons name="download-outline" size={17} color={isDark ? '#E2E8F0' : '#334155'} />
            {isDesktop && (
              <Text style={[st.actionBtnGhostText, isDark && { color: '#E2E8F0' }]}>Export</Text>
            )}
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              st.actionBtnGhost,
              hovered && st.actionBtnGhostHover,
              isDark && st.actionBtnGhostDark,
            ]}
            onPress={onRefresh}
            hitSlop={6}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color={isDark ? '#E2E8F0' : '#334155'}
              style={refreshing ? st.spinAnim : undefined}
            />
          </Pressable>
        </View>
      </View>

      {/* Tabs Bar with Fix for Vertical Squishing / Clipping */}
      <View
        style={[
          st.tabsBar,
          {
            backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.tabsScroll}
          contentContainerStyle={st.tabsContent}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge =
              t.id === 'Approvals'
                ? stats?.pending_approvals_count
                : t.id === 'Disputes'
                  ? stats?.active_disputes_count
                  : 0;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={({ hovered }: any) => [
                  st.tabPill,
                  active ? st.tabPillActive : st.tabPillInactive,
                  !active && isDark && st.tabPillInactiveDark,
                  hovered && !active && st.tabPillHover,
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? '#FFFFFF' : isDark ? '#94A3B8' : '#64748B'}
                />
                <Text
                  style={[
                    st.tabLabel,
                    active ? st.tabLabelActive : st.tabLabelInactive,
                    !active && isDark && { color: '#CBD5E1' },
                  ]}
                >
                  {t.label}
                </Text>
                {Boolean(badge && badge > 0) && (
                  <View style={[st.tabBadge, active && st.tabBadgeActive]}>
                    <Text style={[st.tabBadgeText, active && st.tabBadgeTextActive]}>
                      {badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab 1: Dashboard */}
      {tab === 'Dashboard' && (
        <ScrollView
          contentContainerStyle={st.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Stat Cards Grid */}
          <View style={st.grid}>
            {statCardsData.map((card) => (
              <View
                key={card.label}
                style={[
                  st.statCard,
                  { width: cardWidth },
                  isDark ? st.statCardDark : st.statCardLight,
                ]}
              >
                <View style={st.statCardHeader}>
                  <View style={[st.statIconWrap, { backgroundColor: card.bg }]}>
                    <Ionicons name={card.icon} size={18} color={card.color} />
                  </View>
                  <Text
                    style={[st.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}
                    numberOfLines={1}
                  >
                    {card.label}
                  </Text>
                </View>

                <Text
                  style={[st.statValue, { color: card.color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {card.value}
                </Text>

                {card.isProgress ? (
                  <View style={st.progressContainer}>
                    <View
                      style={[
                        st.progressTrack,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
                      ]}
                    >
                      <View
                        style={[
                          st.progressFill,
                          {
                            width: `${Math.max(Math.min((card.progress || 0) * 100, 100), 2)}%`,
                            backgroundColor: card.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[st.statSub, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {card.sub}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[st.statSub, { color: isDark ? '#64748B' : '#94A3B8' }]}
                    numberOfLines={1}
                  >
                    {card.sub}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Section: Recent Transactions */}
          <View style={st.sectionHeader}>
            <View>
              <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                Recent Transactions
              </Text>
              <Text style={[st.sectionSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Latest fines posted to student accounts
              </Text>
            </View>
            <Pressable
              style={({ hovered }: any) => [
                st.viewAllBtn,
                hovered && st.viewAllBtnHover,
              ]}
              onPress={() => setTab('Transactions')}
            >
              <Text style={st.viewAllText}>View all ({meta.total || fines.length})</Text>
              <Ionicons name="arrow-forward" size={14} color="#D97706" />
            </Pressable>
          </View>

          <View style={st.listWrap}>
            {(fines || []).slice(0, 8).map((item) => (
              <FineRow
                key={item.id}
                item={item}
                isDark={isDark}
                onPress={() => router.push(`/accounts/fines/${item.id}` as never)}
              />
            ))}

            {fines.length === 0 && (
              <Empty
                icon="shield-checkmark-outline"
                title="No active fines posted"
                text="No manual or automatic fines have been posted yet. You can create a fine or adjust fees at any time."
                actionLabel={canCreate ? 'Create Fine' : undefined}
                onAction={canCreate ? () => setCreateOpen(true) : undefined}
                isDark={isDark}
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* Tab 2 & 3: Transactions & Approvals */}
      {(tab === 'Transactions' || tab === 'Approvals') && (
        <View style={{ flex: 1 }}>
          {/* Toolbar: Search & Filters */}
          <View
            style={[
              st.toolbarCard,
              {
                backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <View style={st.searchRow}>
              <View
                style={[
                  st.searchBox,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="search-outline" size={17} color="#94A3B8" />
                <AppTextInput
                  style={[st.searchInput, isDark && { color: '#FFFFFF' }]}
                  placeholder="Search student name, admission no, fine ID…"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={search}
                  onChangeText={setSearch}
                />
                {Boolean(search) && (
                  <Pressable onPress={() => setSearch('')} hitSlop={6}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </Pressable>
                )}
              </View>

              {canCreate && tab === 'Transactions' && (
                <Pressable
                  style={st.actionBtnPrimary}
                  onPress={() => setCreateOpen(true)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={st.actionBtnPrimaryText}>New Fine</Text>
                </Pressable>
              )}

              <Pressable
                style={[
                  st.iconBtnGhost,
                  isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                ]}
                onPress={() => FineService.exportFines().catch(() => {})}
                hitSlop={6}
              >
                <Ionicons name="download-outline" size={18} color={isDark ? '#E2E8F0' : '#0F172A'} />
              </Pressable>
            </View>

            {tab === 'Transactions' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={st.filterScroll}
                contentContainerStyle={st.filterRow}
              >
                {[
                  { key: '', label: 'All Statuses' },
                  { key: 'POSTED', label: 'Posted' },
                  { key: 'PARTIALLY_PAID', label: 'Partially Paid' },
                  { key: 'PAID', label: 'Paid' },
                  { key: 'WAIVED', label: 'Waived' },
                  { key: 'DISPUTED', label: 'Disputed' },
                  { key: 'CANCELLED', label: 'Cancelled' },
                ].map((s) => {
                  const on = statusFilter === s.key;
                  return (
                    <Pressable
                      key={s.key || 'all'}
                      onPress={() => setStatusFilter(s.key)}
                      style={[
                        st.filterChip,
                        on ? st.filterChipOn : st.filterChipOff,
                        !on && isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                      ]}
                    >
                      <Text
                        style={[
                          st.filterChipText,
                          on ? st.filterChipTextOn : st.filterChipTextOff,
                          !on && isDark && { color: '#94A3B8' },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* List View */}
          <FlatList
            data={fines}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <FineRow
                item={item}
                isDark={isDark}
                onPress={() => router.push(`/accounts/fines/${item.id}` as never)}
              />
            )}
            ListEmptyComponent={
              <Empty
                icon={tab === 'Approvals' ? 'checkmark-circle-outline' : 'search-outline'}
                title={tab === 'Approvals' ? 'No pending approvals' : 'No records found'}
                text={
                  tab === 'Approvals'
                    ? 'All fine requests raised by teachers have been reviewed.'
                    : 'No fines match your current search query or status filter.'
                }
                isDark={isDark}
              />
            }
          />

          {/* Interactive Pagination Bar */}
          <View
            style={[
              st.paginationBar,
              {
                backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Text style={[st.pageHint, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Page {meta.page} of {meta.total_pages} · {meta.total} records
            </Text>

            <View style={st.paginationBtns}>
              <Pressable
                disabled={meta.page <= 1}
                onPress={() => loadFines(meta.page - 1)}
                style={[
                  st.pageBtn,
                  meta.page <= 1 && st.pageBtnDisabled,
                  isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={meta.page <= 1 ? '#94A3B8' : isDark ? '#FFFFFF' : '#0F172A'}
                />
                <Text
                  style={[
                    st.pageBtnText,
                    meta.page <= 1 && { color: '#94A3B8' },
                    isDark && meta.page > 1 && { color: '#FFFFFF' },
                  ]}
                >
                  Previous
                </Text>
              </Pressable>

              <Pressable
                disabled={meta.page >= meta.total_pages}
                onPress={() => loadFines(meta.page + 1)}
                style={[
                  st.pageBtn,
                  meta.page >= meta.total_pages && st.pageBtnDisabled,
                  isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Text
                  style={[
                    st.pageBtnText,
                    meta.page >= meta.total_pages && { color: '#94A3B8' },
                    isDark && meta.page < meta.total_pages && { color: '#FFFFFF' },
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={meta.page >= meta.total_pages ? '#94A3B8' : isDark ? '#FFFFFF' : '#0F172A'}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Tab 4: Policies */}
      {tab === 'Policies' && (
        <PoliciesTab
          categories={categories}
          policies={policies}
          canManage={canCreate}
          isDark={isDark}
          onReload={loadDashboard}
        />
      )}

      {/* Tab 5: Waivers */}
      {tab === 'Waivers' && <WaiversTab isDark={isDark} />}

      {/* Tab 6: Disputes */}
      {tab === 'Disputes' && (
        <DisputesTab canResolve={canApprove || canWaive} isDark={isDark} />
      )}

      {/* Tab 7: Reports */}
      {tab === 'Reports' && <ReportsTab isDark={isDark} />}

      {/* Modal: Create Fine */}
      <CreateFineModal
        visible={createOpen}
        categories={categories}
        policies={policies}
        isDark={isDark}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          boot();
        }}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Fine Row Item Component
 * ───────────────────────────────────────────────────────────── */
function FineRow({
  item,
  isDark,
  onPress,
}: {
  item: Fine;
  isDark: boolean;
  onPress: () => void;
}) {
  const avatar = getStudentColor(item.student_name);
  const initials = getInitials(item.student_name);

  return (
    <Pressable
      style={({ hovered }: any) => [
        st.rowCard,
        isDark ? st.rowCardDark : st.rowCardLight,
        hovered && (isDark ? st.rowCardDarkHover : st.rowCardLightHover),
      ]}
      onPress={onPress}
    >
      {/* Avatar Badge */}
      <View style={[st.avatarBadge, { backgroundColor: avatar.bg, borderColor: avatar.border }]}>
        <Text style={[st.avatarText, { color: avatar.text }]}>{initials}</Text>
      </View>

      {/* Main Info */}
      <View style={{ flex: 1, gap: 3 }}>
        <View style={st.rowTitleRow}>
          <Text
            style={[st.rowTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}
            numberOfLines={1}
          >
            {item.student_name || 'Student'}
          </Text>
          {Boolean(item.class_name) && (
            <View
              style={[
                st.classBadge,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
            >
              <Text style={[st.classBadgeText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                {item.class_name} {item.section_name || ''}
              </Text>
            </View>
          )}
        </View>

        <Text style={[st.rowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          <Text style={{ fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155' }}>
            {item.fine_no}
          </Text>
          {' · '}
          {item.admission_no || item.student_admission_no || '—'}
          {' · '}
          <Text style={{ color: '#D97706', fontWeight: '600' }}>
            {item.category_name || 'General'}
          </Text>
          {' · '}
          <Text style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            {item.source_type || 'MANUAL'}
          </Text>
        </Text>

        {Boolean(item.reason) && (
          <Text
            style={[st.rowReason, { color: isDark ? '#64748B' : '#64748B' }]}
            numberOfLines={1}
          >
            "{item.reason}"
          </Text>
        )}
      </View>

      {/* Right Details */}
      <View style={st.rowRight}>
        <Text style={[st.rowAmt, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
          {fmtINR(Number(item.outstanding_amount))}
        </Text>
        <StatusChip status={item.status} />
      </View>

      <Ionicons name="chevron-forward" size={16} color={isDark ? '#64748B' : '#94A3B8'} />
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Empty State Component
 * ───────────────────────────────────────────────────────────── */
function Empty({
  icon = 'shield-checkmark-outline',
  title = 'No items found',
  text,
  actionLabel,
  onAction,
  isDark,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        st.emptyCard,
        {
          backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View
        style={[
          st.emptyIconBox,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' },
        ]}
      >
        <Ionicons name={icon} size={36} color="#D97706" />
      </View>
      <Text style={[st.emptyTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{title}</Text>
      <Text style={[st.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{text}</Text>
      {Boolean(actionLabel && onAction) && (
        <Pressable style={st.actionBtnPrimary} onPress={onAction}>
          <Ionicons name="add-circle" size={16} color="#FFFFFF" />
          <Text style={st.actionBtnPrimaryText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Create Fine Modal (Centered Dialog on Web)
 * ───────────────────────────────────────────────────────────── */
function CreateFineModal({
  visible,
  categories,
  policies,
  isDark,
  onClose,
  onCreated,
}: {
  visible: boolean;
  categories: FineCategory[];
  policies: FinePolicy[];
  isDark: boolean;
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
    if (query.length < 2) {
      setMatches([]);
      return;
    }
    const t = setTimeout(() => {
      StudentService.getAll<Student>({ search: query, limit: 8 })
        .then((page) => {
          setMatches(page?.data || []);
        })
        .catch(() => {});
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
        alertCompat(
          'Possible duplicate',
          'A similar fine exists for this student today. Create anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create anyway', onPress: () => submit(true) },
          ],
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={st.modalBackdrop}>
        <View
          style={[
            st.modalCard,
            {
              backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {/* Modal Header */}
          <View style={st.modalHeader}>
            <View>
              <Text style={[st.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                Create Fine / Penalty
              </Text>
              <Text style={[st.modalSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Assign a disciplinary fine or adjustment to student balance
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                st.modalCloseBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>
          </View>

          <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
            {/* Student Search */}
            <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              Student <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            {student ? (
              <View
                style={[
                  st.selectedStudentBox,
                  {
                    backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : '#FEF3C7',
                    borderColor: '#FDE68A',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[st.selectedStudentName, { color: '#92400E' }]}>
                    {student.display_name || `${student.first_name} ${student.last_name || ''}`}
                  </Text>
                  <Text style={[st.selectedStudentMeta, { color: '#B45309' }]}>
                    Adm: {student.admission_no}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setStudent(null);
                    setQuery('');
                  }}
                  style={st.changeStudentBtn}
                >
                  <Text style={st.changeStudentText}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <View
                  style={[
                    st.inputBox,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <AppTextInput
                    placeholder="Search student by name or admission no…"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={query}
                    onChangeText={setQuery}
                    style={[st.input, isDark && { color: '#FFFFFF' }]}
                  />
                </View>
                {matches.length > 0 && (
                  <View
                    style={[
                      st.matchDropdown,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                      },
                    ]}
                  >
                    {matches.map((s) => (
                      <Pressable
                        key={s.id}
                        style={({ hovered }: any) => [
                          st.matchItem,
                          hovered && (isDark ? { backgroundColor: 'rgba(255,255,255,0.06)' } : { backgroundColor: '#F8FAFC' }),
                        ]}
                        onPress={() => {
                          setStudent(s);
                          setQuery('');
                          setMatches([]);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[st.matchTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                            {s.display_name || `${s.first_name} ${s.last_name || ''}`}
                          </Text>
                          <Text style={[st.matchMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            Adm No: {s.admission_no}
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#D97706" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Category Selector */}
            <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              Fine Category <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 8 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {categories
                .filter((c) => c.active)
                .map((c) => {
                  const on = categoryId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      style={[
                        st.filterChip,
                        on ? st.filterChipOn : st.filterChipOff,
                        !on && isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                      ]}
                    >
                      <Text
                        style={[
                          st.filterChipText,
                          on ? st.filterChipTextOn : st.filterChipTextOff,
                          !on && isDark && { color: '#94A3B8' },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
            </ScrollView>

            {/* Policy Selector (Optional) */}
            {policies.filter((p) => !categoryId || p.category_id === categoryId).length > 0 && (
              <>
                <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                  Preset Policy (optional)
                </Text>
                <View style={{ gap: 6, marginBottom: 8 }}>
                  {policies
                    .filter((p) => !categoryId || p.category_id === categoryId)
                    .map((p) => {
                      const sel = policyId === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setPolicyId(sel ? '' : p.id)}
                          style={[
                            st.policyCard,
                            sel && st.policyCardSelected,
                            isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                            sel && { borderColor: '#D97706', backgroundColor: isDark ? 'rgba(217,119,6,0.12)' : '#FEF3C7' },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                st.policyName,
                                { color: isDark ? '#FFFFFF' : '#0F172A' },
                                sel && { color: '#92400E' },
                              ]}
                            >
                              {p.name}
                            </Text>
                            <Text style={[st.policyMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                              {p.calculation_type}
                              {p.fixed_amount ? ` · ${fmtINR(Number(p.fixed_amount))}` : ''}
                              {p.per_day_amount ? ` · ${fmtINR(Number(p.per_day_amount))}/day` : ''}
                            </Text>
                          </View>
                          <Ionicons
                            name={sel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={sel ? '#D97706' : '#94A3B8'}
                          />
                        </Pressable>
                      );
                    })}
                </View>
              </>
            )}

            {/* Amount */}
            <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              Fine Amount (₹) <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <View
              style={[
                st.inputBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                },
              ]}
            >
              <Text style={{ fontWeight: '800', color: '#D97706', fontSize: 16 }}>₹</Text>
              <AppTextInput
                placeholder="e.g. 250"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={[st.input, isDark && { color: '#FFFFFF' }]}
              />
            </View>

            {/* Reason */}
            <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              Reason <Text style={{ color: '#DC2626' }}>*</Text>{' '}
              <Text style={st.fieldHint}>(visible to parent & on receipts)</Text>
            </Text>
            <View
              style={[
                st.inputBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                },
              ]}
            >
              <AppTextInput
                placeholder="e.g. Broken laboratory apparatus / Late book return"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={reason}
                onChangeText={setReason}
                style={[st.input, isDark && { color: '#FFFFFF' }]}
              />
            </View>

            {/* Internal Note */}
            <Text style={[st.fieldLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
              Internal Note <Text style={st.fieldHint}>(staff only)</Text>
            </Text>
            <View
              style={[
                st.inputBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                },
              ]}
            >
              <AppTextInput
                placeholder="Optional notes for audit logs…"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={note}
                onChangeText={setNote}
                style={[st.input, isDark && { color: '#FFFFFF' }]}
              />
            </View>
          </ScrollView>

          {/* Modal Footer Actions */}
          <View
            style={[
              st.modalFooter,
              {
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={[
                st.modalCancelBtn,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
              ]}
            >
              <Text style={[st.modalCancelText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              style={[st.actionBtnPrimary, saving && { opacity: 0.7 }]}
              onPress={() => submit(false)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={st.actionBtnPrimaryText}>Post Fine</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Tab 4: Policies Component
 * ───────────────────────────────────────────────────────────── */
function PoliciesTab({
  categories,
  policies,
  canManage,
  isDark,
  onReload,
}: {
  categories: FineCategory[];
  policies: FinePolicy[];
  canManage: boolean;
  isDark: boolean;
  onReload: () => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScrollView contentContainerStyle={st.scrollContent}>
      {canManage && (
        <View
          style={[
            st.cardSection,
            {
              backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            Add Fine Category
          </Text>
          <Text style={[st.sectionSub, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 12 }]}>
            Categories group fines for reporting and policy rules
          </Text>

          <View style={st.formRow}>
            <AppTextInput
              placeholder="Category Name (e.g. Lab Damage)"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={name}
              onChangeText={setName}
              style={[
                st.formInput,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                },
              ]}
            />
            <AppTextInput
              placeholder="Category Code (e.g. LAB_DAMAGE)"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={code}
              onChangeText={setCode}
              style={[
                st.formInput,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                  color: isDark ? '#FFFFFF' : '#0F172A',
                },
              ]}
            />
          </View>

          <Pressable
            style={[st.actionBtnPrimary, { alignSelf: 'flex-start' }, submitting && { opacity: 0.6 }]}
            disabled={submitting}
            onPress={async () => {
              if (!name || !code) {
                alertCompat('Required fields', 'Please provide a name and code.');
                return;
              }
              setSubmitting(true);
              try {
                await FineService.createCategory({ name, code: code.toUpperCase() });
                setName('');
                setCode('');
                onReload();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={st.actionBtnPrimaryText}>Add Category</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Categories List */}
      <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A', marginHorizontal: 16, marginTop: 14 }]}>
        Active Categories ({categories.length})
      </Text>
      <View style={st.listWrap}>
        {categories.map((c) => (
          <View
            key={c.id}
            style={[
              st.rowCard,
              isDark ? st.rowCardDark : st.rowCardLight,
              { alignItems: 'center' },
            ]}
          >
            <View style={[st.statIconWrap, { backgroundColor: c.active ? '#D1FAE5' : '#F1F5F9' }]}>
              <Ionicons
                name={c.active ? 'folder-outline' : 'folder'}
                size={18}
                color={c.active ? '#059669' : '#64748B'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.rowTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {c.name}
              </Text>
              <Text style={[st.rowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Code: {c.code} · {c.active ? 'Active' : 'Disabled'}
              </Text>
            </View>
            {canManage && (
              <Pressable
                onPress={async () => {
                  await FineService.updateCategory(c.id, { active: !c.active });
                  onReload();
                }}
                style={[
                  st.pillBtn,
                  { backgroundColor: c.active ? '#FEE2E2' : '#D1FAE5' },
                ]}
              >
                <Text
                  style={[
                    st.pillBtnText,
                    { color: c.active ? '#DC2626' : '#059669' },
                  ]}
                >
                  {c.active ? 'Deactivate' : 'Activate'}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {/* Policies List */}
      <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A', marginHorizontal: 16, marginTop: 18 }]}>
        Configured Policies ({policies.length})
      </Text>
      <View style={st.listWrap}>
        {policies.map((p) => (
          <View
            key={p.id}
            style={[
              st.rowCard,
              isDark ? st.rowCardDark : st.rowCardLight,
              { alignItems: 'center' },
            ]}
          >
            <View style={[st.statIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.rowTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {p.name}
              </Text>
              <Text style={[st.rowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {p.category_name || 'Category'} · Formula: {p.calculation_type}
                {p.fixed_amount ? ` · ${fmtINR(Number(p.fixed_amount))}` : ''}
                {p.per_day_amount ? ` · ${fmtINR(Number(p.per_day_amount))}/day` : ''}
                {' · '}
                {p.auto_apply ? 'Auto-apply' : 'Manual'}
                {p.approval_required ? ' · Approval required' : ''}
              </Text>
            </View>
          </View>
        ))}

        {policies.length === 0 && (
          <Empty
            icon="shield-outline"
            title="No policies configured"
            text="Preset policies allow automated fee calculation for library delays, bus damage, and late fees."
            isDark={isDark}
          />
        )}
      </View>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Tab 5: Waivers Component
 * ───────────────────────────────────────────────────────────── */
function WaiversTab({ isDark }: { isDark: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    FineService.listWaivers({ limit: 50 })
      .then((r) => setRows(r?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  if (!rows.length) {
    return (
      <Empty
        icon="gift-outline"
        title="No waivers recorded"
        text="When principal or authorized accountants waive fines, waiver audit entries will appear here."
        isDark={isDark}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      renderItem={({ item }) => {
        const avatar = getStudentColor(item.student_name);
        return (
          <View
            style={[
              st.rowCard,
              isDark ? st.rowCardDark : st.rowCardLight,
              { alignItems: 'center' },
            ]}
          >
            <View style={[st.avatarBadge, { backgroundColor: avatar.bg, borderColor: avatar.border }]}>
              <Text style={[st.avatarText, { color: avatar.text }]}>
                {getInitials(item.student_name)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.rowTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {item.student_name}
              </Text>
              <Text style={[st.rowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Fine: {item.fine_no} · Reason: {item.reason || 'Management approval'}
              </Text>
            </View>
            <Text style={[st.rowAmt, { color: '#059669' }]}>
              -{fmtINR(Number(item.amount))}
            </Text>
          </View>
        );
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Tab 6: Disputes Component
 * ───────────────────────────────────────────────────────────── */
function DisputesTab({
  canResolve,
  isDark,
}: {
  canResolve: boolean;
  isDark: boolean;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    FineService.listDisputes({ status: 'OPEN' })
      .then((r) => setRows(r?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  if (!rows.length) {
    return (
      <Empty
        icon="checkmark-circle-outline"
        title="No active disputes"
        text="Parents can request reviews for disputed fines from the student portal. None are currently pending."
        isDark={isDark}
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      renderItem={({ item }) => (
        <View
          style={[
            st.rowCard,
            isDark ? st.rowCardDark : st.rowCardLight,
            { flexDirection: 'column', alignItems: 'stretch', gap: 10 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[st.statIconWrap, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#9D174D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.rowTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {item.student_name}
              </Text>
              <Text style={[st.rowMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Fine: {item.fine_no} · Type: {item.reason_type || item.reason}
              </Text>
            </View>
          </View>

          {Boolean(item.message) && (
            <View
              style={[
                st.quoteBox,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <Text style={[st.quoteText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                "{item.message}"
              </Text>
            </View>
          )}

          {canResolve && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable
                style={[st.pillBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={async () => {
                  await FineService.resolveDispute(item.id, {
                    resolution_action: 'DISMISSED',
                    resolution_note: 'Reviewed and upheld by accounts',
                  });
                  load();
                }}
              >
                <Text style={[st.pillBtnText, { color: '#DC2626' }]}>Dismiss Dispute</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Tab 7: Reports Component
 * ───────────────────────────────────────────────────────────── */
function ReportsTab({ isDark }: { isDark: boolean }) {
  const [aging, setAging] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      FineService.getAgingReport()
        .then(setAging)
        .catch(() => {}),
      FineService.getCategoryReport()
        .then((r) => setCats(Array.isArray(r) ? r : []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.scrollContent}>
      {/* Aging Report */}
      <View
        style={[
          st.cardSection,
          {
            backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
          Aging Analysis (Overdue Fines)
        </Text>
        <Text style={[st.sectionSub, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 12 }]}>
          Breakdown of unpaid fine amounts by duration since posted
        </Text>

        {aging &&
          Object.entries(aging).map(([k, v]: any) => (
            <View
              key={k}
              style={[
                st.reportRow,
                {
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                },
              ]}
            >
              <Text style={[st.reportRowLabel, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {v.label || k}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[st.reportRowVal, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {fmtINR(v.total_amount || 0)}
                </Text>
                <Text style={[st.reportRowSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {v.count || 0} fines
                </Text>
              </View>
            </View>
          ))}
      </View>

      {/* By Category */}
      <View
        style={[
          st.cardSection,
          {
            backgroundColor: isDark ? '#151D2D' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            marginTop: 14,
          },
        ]}
      >
        <Text style={[st.sectionTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
          Distribution by Category
        </Text>
        <Text style={[st.sectionSub, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 12 }]}>
          Revenue and outstanding amounts per penalty classification
        </Text>

        {cats.map((c) => (
          <View
            key={c.category_id}
            style={[
              st.reportRow,
              {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
              },
            ]}
          >
            <View>
              <Text style={[st.reportRowLabel, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {c.category_name}
              </Text>
              <Text style={[st.reportRowSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {c.fines_count || 0} total posted
              </Text>
            </View>
            <Text style={[st.reportRowVal, { color: '#DC2626' }]}>
              {fmtINR(Number(c.total_outstanding || 0))}
            </Text>
          </View>
        ))}

        {cats.length === 0 && (
          <Text style={[st.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            No fine category metrics available yet.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────────
 *  Styles
 * ───────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16, paddingBottom: 60 },

  /* Header Bar */
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTextGroup: { flex: 1, minWidth: 260 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  headerActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  /* Action Buttons */
  actionBtnPrimary: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...Shadows.sm,
  },
  actionBtnPrimaryHover: {
    backgroundColor: '#B45309',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnGhost: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  actionBtnGhostHover: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  actionBtnGhostDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionBtnGhostText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
  iconBtnGhost: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  spinAnim: {
    transform: [{ rotate: '45deg' }],
  },

  /* Tabs Bar */
  tabsBar: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  tabPillActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
    ...Shadows.sm,
  },
  tabPillInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  tabPillInactiveDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabPillHover: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabLabelInactive: {
    color: '#475569',
  },
  tabBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },

  /* Stat Cards Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  statCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statCardDark: {
    backgroundColor: '#151D2D',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  viewAllBtnHover: {
    opacity: 0.8,
  },
  viewAllText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 13,
  },

  /* List & Cards */
  listWrap: {
    gap: 10,
  },
  rowCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
    ...Shadows.sm,
  },
  rowCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  rowCardDark: {
    backgroundColor: '#151D2D',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rowCardLightHover: {
    borderColor: 'rgba(217,119,6,0.35)',
    backgroundColor: '#FFFCF7',
  },
  rowCardDarkHover: {
    borderColor: 'rgba(217,119,6,0.5)',
    backgroundColor: '#1C2438',
  },
  avatarBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  classBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
  },
  rowReason: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowAmt: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  /* Chip */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Toolbar Card in Transactions */
  toolbarCard: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    ...Shadows.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  filterChipOn: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterChipOff: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextOn: {
    color: '#FFFFFF',
  },
  filterChipTextOff: {
    color: '#475569',
  },

  /* Pagination Bar */
  paginationBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  pageHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: Platform.OS === 'web' ? 'auto' : undefined,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Empty State */
  emptyCard: {
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginVertical: 12,
    gap: 8,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 18,
  },

  /* Centered Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCancelText: {
    fontWeight: '700',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  fieldHint: {
    fontWeight: '400',
    color: '#94A3B8',
    fontSize: 11,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  selectedStudentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  selectedStudentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectedStudentMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  changeStudentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  changeStudentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  matchDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  matchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  matchMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  policyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  policyCardSelected: {
    borderColor: '#D97706',
  },
  policyName: {
    fontSize: 13,
    fontWeight: '700',
  },
  policyMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  /* Policies & Reports Section Styles */
  cardSection: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    ...Shadows.sm,
  },
  formRow: {
    gap: 10,
    marginBottom: 12,
  },
  formInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quoteBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  reportRowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportRowVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  reportRowSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
