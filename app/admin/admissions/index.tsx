import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AdminHeader from '../../../src/components/AdminHeader';
import {
  admissionService,
  type PipelineStageGroup,
  type PipelineResponse,
} from '../../../src/services/admissionService';
import type { AdmissionApplication } from '../../../src/types/admission';
import { showAlert } from '../../../src/components/CustomAlert';

type ViewMode = 'kanban' | 'list';

export default function AdminAdmissionsPipelineScreen() {
  const router = useRouter();
  const segments = useSegments();
  const isStaffPortal = segments[0] === 'staff';
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // Pipeline Data
  const [pipelineData, setPipelineData] = useState<PipelineResponse | null>(null);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [totalApps, setTotalApps] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [slaFilterOnly, setSlaFilterOnly] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const fetchPipeline = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [pipelineRes, appsRes] = await Promise.all([
        admissionService.getPipeline({
          search: searchQuery || undefined,
          classId: selectedClassId || undefined,
        }),
        admissionService.getApplications({
          search: searchQuery || undefined,
          classId: selectedClassId || undefined,
          isSlaBreached: slaFilterOnly ? true : undefined,
          limit: 100,
        }),
      ]);

      setPipelineData(pipelineRes);
      setApplications(appsRes.applications || []);
      setTotalApps(appsRes.total || 0);
    } catch (err: any) {
      showAlert({
        title: 'Error Loading Pipeline',
        message: err?.response?.data?.error || err?.message || 'Could not fetch admission pipeline',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedClassId, slaFilterOnly]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Aggregate metrics
  const totalCount = pipelineData?.totalCount || totalApps;
  const slaBreached = pipelineData?.slaBreachedCount || 0;
  const stages = pipelineData?.pipeline || [];

  const renderKanbanCard = (app: AdmissionApplication) => {
    const isBreached = app.is_sla_breached;
    const isHighPriority = app.priority === 'HIGH' || app.priority === 'URGENT';

    return (
      <TouchableOpacity
        key={app.id}
        style={[
          styles.kanbanCard,
          isBreached && styles.kanbanCardBreached,
        ]}
        onPress={() => router.push((isStaffPortal ? `/staff/admission-detail?id=${app.id}` : `/admin/admissions/${app.id}`) as any)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardAppNo}>{app.application_no || app.application_number}</Text>
          {isHighPriority && (
            <View style={styles.priorityDot} />
          )}
        </View>

        <Text style={styles.cardStudentName} numberOfLines={1}>
          {app.student_first_name} {app.student_last_name}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.classPill}>
            <Text style={styles.classPillText}>{app.class_name || 'Class'}</Text>
          </View>
          <Text style={styles.cardParentPhone} numberOfLines={1}>
            📞 {app.father_phone || app.parent_phone}
          </Text>
        </View>

        {isBreached && (
          <View style={styles.slaBreachPill}>
            <Ionicons name="alert-circle" size={12} color="#DC2626" />
            <Text style={styles.slaBreachText}>SLA BREACHED</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>
            Applied: {new Date(app.created_at).toLocaleDateString()}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Admission Pipeline"
        showBackButton
        rightAction={{
          icon: 'refresh-outline',
          onPress: () => fetchPipeline(true),
        }}
      />

      {/* Top Summary Banner & Navigation Actions */}
      <View style={styles.topControlBar}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/admission/enquiry')}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>New Enquiry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/admin/admissions/workflow-config' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={16} color="#0F766E" />
            <Text style={styles.secondaryActionBtnText}>Workflow Config</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/admin/admissions/analytics' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="bar-chart-outline" size={16} color="#0F766E" />
            <Text style={styles.secondaryActionBtnText}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => admissionService.exportCsv('applications')}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={16} color="#0F766E" />
            <Text style={styles.secondaryActionBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'kanban' && styles.toggleBtnActive]}
            onPress={() => setViewMode('kanban')}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === 'kanban' ? '#0F766E' : '#64748B'}
            />
            <Text
              style={[styles.toggleBtnText, viewMode === 'kanban' && styles.toggleBtnTextActive]}
            >
              Pipeline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={viewMode === 'list' ? '#0F766E' : '#64748B'}
            />
            <Text
              style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiContainer}
      >
        <View style={[styles.kpiCard, { borderColor: '#CBD5E1' }]}>
          <Text style={styles.kpiVal}>{totalCount}</Text>
          <Text style={styles.kpiLabel}>Total Candidates</Text>
        </View>

        <TouchableOpacity
          style={[styles.kpiCard, slaBreached > 0 && styles.kpiCardBreached]}
          onPress={() => setSlaFilterOnly(!slaFilterOnly)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={[
                styles.kpiVal,
                slaBreached > 0 ? { color: '#DC2626' } : { color: '#0F172A' },
              ]}
            >
              {slaBreached}
            </Text>
            {slaBreached > 0 && <Ionicons name="warning" size={16} color="#DC2626" />}
          </View>
          <Text
            style={[
              styles.kpiLabel,
              slaBreached > 0 ? { color: '#B91C1C' } : { color: '#64748B' },
            ]}
          >
            SLA Breached {slaFilterOnly ? '(Active Filter)' : ''}
          </Text>
        </TouchableOpacity>

        {stages.slice(0, 4).map((st) => (
          <View key={st.stageId} style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: st.color || '#0F766E' }]}>
              {st.count}
            </Text>
            <Text style={styles.kpiLabel} numberOfLines={1}>
              {st.stageName}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Search & Filter Bar */}
      <View style={styles.filterRow}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search candidate name, app no, phone..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchPipeline()}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {slaFilterOnly && (
          <TouchableOpacity
            style={styles.clearFilterBadge}
            onPress={() => setSlaFilterOnly(false)}
          >
            <Text style={styles.clearFilterText}>Clear SLA Filter</Text>
            <Ionicons name="close" size={14} color="#B91C1C" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Updating pipeline data...</Text>
        </View>
      ) : viewMode === 'kanban' ? (
        /* KANBAN PIPELINE VIEW */
        <ScrollView
          horizontal
          style={styles.kanbanScroll}
          contentContainerStyle={styles.kanbanContent}
          showsHorizontalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPipeline(true)} />
          }
        >
          {stages.map((stage) => (
            <View key={stage.stageId} style={styles.kanbanColumn}>
              <View style={styles.columnHeader}>
                <View style={styles.columnTitleRow}>
                  <View
                    style={[styles.stageColorBar, { backgroundColor: stage.color || '#0F766E' }]}
                  />
                  <Text style={styles.columnTitle}>{stage.stageName}</Text>
                </View>
                <View style={styles.columnBadge}>
                  <Text style={styles.columnBadgeText}>{stage.count}</Text>
                </View>
              </View>

              <ScrollView
                style={styles.columnScroll}
                contentContainerStyle={styles.columnCardsContainer}
                showsVerticalScrollIndicator={false}
              >
                {stage.applications.length === 0 ? (
                  <View style={styles.emptyColumn}>
                    <Text style={styles.emptyColumnText}>No applications in this stage</Text>
                  </View>
                ) : (
                  stage.applications.map((app) => renderKanbanCard(app))
                )}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      ) : (
        /* LIST VIEW */
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchPipeline(true)} />
          }
        >
          {applications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Applications Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or stage filters.
              </Text>
            </View>
          ) : (
            applications.map((app) => {
              const isBreached = app.is_sla_breached;
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.listItem, isBreached && styles.listItemBreached]}
                  onPress={() => router.push((isStaffPortal ? `/staff/admission-detail?id=${app.id}` : `/admin/admissions/${app.id}`) as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listLeft}>
                    <View style={styles.listAvatar}>
                      <Text style={styles.listAvatarText}>
                        {(app.student_first_name || 'A')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.listInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.listStudentName}>
                          {app.student_first_name} {app.student_last_name}
                        </Text>
                        <View style={styles.classPill}>
                          <Text style={styles.classPillText}>{app.class_name || 'Grade'}</Text>
                        </View>
                      </View>
                      <Text style={styles.listAppNo}>
                        {app.application_number} • {app.parent_phone}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.listRight}>
                    <View
                      style={[
                        styles.listStagePill,
                        { backgroundColor: app.stage_color ? `${app.stage_color}20` : '#CCFBF1' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.listStageText,
                          { color: app.stage_color || '#0F766E' },
                        ]}
                      >
                        {app.current_stage_name || app.status}
                      </Text>
                    </View>
                    {isBreached && (
                      <View style={styles.listSlaBadge}>
                        <Ionicons name="warning" size={12} color="#DC2626" />
                        <Text style={styles.listSlaText}>SLA Breach</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
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
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  secondaryActionBtnText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '600',
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  kpiContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiCardBreached: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  clearFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  kanbanScroll: {
    flex: 1,
  },
  kanbanContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  kanbanColumn: {
    width: 290,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 12,
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  columnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stageColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  columnBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  columnScroll: {
    flex: 1,
  },
  columnCardsContainer: {
    gap: 10,
    paddingBottom: 16,
  },
  emptyColumn: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyColumnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  kanbanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  kanbanCardBreached: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAppNo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  cardStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  classPill: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  classPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  cardParentPhone: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  slaBreachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  slaBreachText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listItemBreached: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  listLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F766E',
  },
  listInfoCol: {
    flex: 1,
  },
  listStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  listAppNo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listStagePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  listStageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listSlaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listSlaText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
