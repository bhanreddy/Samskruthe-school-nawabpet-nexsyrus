import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DueStudentItem, FeeDueSummary } from '../../types/documentTemplate';

interface StudentDueTableProps {
  students: DueStudentItem[];
  summary: FeeDueSummary;
  selectedIds: Set<string>;
  onToggleSelect: (studentId: string) => void;
  onSelectAllVisible: () => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onSingleGenerate: (student: DueStudentItem) => void;
  onSinglePreview: (student: DueStudentItem) => void;
  onSinglePrint: (student: DueStudentItem) => void;
  onBulkGenerate: () => void;
  onBulkPrint: () => void;
  onBulkCombinedPdf: () => void;
  onBulkZip: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
  isDark?: boolean;
}

export const StudentDueTable: React.FC<StudentDueTableProps> = ({
  students,
  summary,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onSelectAllFiltered,
  onClearSelection,
  onSingleGenerate,
  onSinglePreview,
  onSinglePrint,
  onBulkGenerate,
  onBulkPrint,
  onBulkCombinedPdf,
  onBulkZip,
  onExportExcel,
  onExportCsv,
  page,
  totalPages,
  onPageChange,
  loading = false,
  isDark = false,
}) => {
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const tableBg = isDark ? '#18202F' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E2E8F0';
  const headerBg = isDark ? '#1F2937' : '#F8FAFC';
  const rowHoverBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.04)';

  const allVisibleSelected =
    students.length > 0 && students.every((s) => selectedIds.has(s.student_id));
  const someVisibleSelected =
    students.some((s) => selectedIds.has(s.student_id)) && !allVisibleSelected;

  const formatInr = (val: number) => '₹' + Number(val || 0).toLocaleString('en-IN');

  return (
    <View style={[styles.container, { backgroundColor: tableBg, borderColor }]}>
      {/* 1. Dynamic Summary Bar */}
      <View style={[styles.summaryBar, { borderBottomColor: borderColor, backgroundColor: headerBg }]}>
        <View style={styles.summaryLeft}>
          <Text style={[styles.summaryMetricText, { color: textColor }]}>
            <strong style={{ fontSize: 16 }}>{summary.total_students.toLocaleString('en-IN')}</strong> students found
          </Text>
          <View style={styles.metricDot} />
          <Text style={[styles.summaryMetricText, { color: '#DC2626' }]}>
            <strong style={{ fontSize: 16 }}>{formatInr(summary.total_due)}</strong> total outstanding
          </Text>
          <View style={styles.metricDot} />
          <Text style={[styles.summaryMetricText, { color: '#059669' }]}>
            <strong>{formatInr(summary.total_paid)}</strong> collected
          </Text>
          {summary.total_concession > 0 && (
            <>
              <View style={styles.metricDot} />
              <Text style={[styles.summaryMetricText, { color: '#D97706' }]}>
                {formatInr(summary.total_concession)} concessions
              </Text>
            </>
          )}
        </View>

        {/* Selection Stats */}
        <View style={styles.summaryRight}>
          {selectedIds.size > 0 ? (
            <View style={styles.selectedPill}>
              <Text style={styles.selectedPillText}>{selectedIds.size} Selected</Text>
              <TouchableOpacity onPress={onClearSelection} style={{ marginLeft: 6 }}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.selectVisibleBtn} onPress={onSelectAllVisible}>
              <Text style={styles.selectVisibleText}>Select Visible</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Bulk Action Bar (when students are selected) */}
      {selectedIds.size > 0 && (
        <View style={[styles.bulkActionBar, { borderBottomColor: borderColor }]}>
          <View style={styles.bulkLeft}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={onBulkGenerate}>
              <Ionicons name="print-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>
                Generate {selectedIds.size} {selectedIds.size === 1 ? 'Slip' : 'Slips'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={onBulkCombinedPdf}>
              <Ionicons name="document-outline" size={15} color="#1E40AF" />
              <Text style={styles.secondaryActionText}>Combined PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={onBulkZip}>
              <Ionicons name="archive-outline" size={15} color="#1E40AF" />
              <Text style={styles.secondaryActionText}>Download ZIP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={onBulkPrint}>
              <Ionicons name="print" size={15} color="#1E40AF" />
              <Text style={styles.secondaryActionText}>Print</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bulkRight}>
            <TouchableOpacity style={styles.exportBtn} onPress={onExportExcel}>
              <Ionicons name="download-outline" size={14} color="#059669" />
              <Text style={styles.exportBtnText}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={onExportCsv}>
              <Ionicons name="download-outline" size={14} color="#4B5563" />
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Data Table */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: subtextColor }]}>Calculating real fee balances...</Text>
        </View>
      ) : students.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={48} color="#94A3B8" />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No students match these filters</Text>
          <Text style={[styles.emptyDesc, { color: subtextColor }]}>
            Try clearing or widening your filters to see student fee records.
          </Text>
        </View>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}`, color: subtextColor }}>
                <th style={{ width: 44, padding: '10px 12px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected;
                    }}
                    onChange={() => {
                      if (allVisibleSelected) onClearSelection();
                      else onSelectAllVisible();
                    }}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Student</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Class</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Father's Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total Fee</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Paid</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Concession</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>
                  Outstanding Due
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Due Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: 110, fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => {
                const isSelected = selectedIds.has(student.student_id);
                const statusColor =
                  student.status === 'Overdue'
                    ? { bg: '#FEE2E2', text: '#991B1B' }
                    : student.status === 'Partial'
                    ? { bg: '#FEF3C7', text: '#92400E' }
                    : student.status === 'Paid'
                    ? { bg: '#D1FAE5', text: '#065F46' }
                    : { bg: '#FEE2E2', text: '#B91C1C' };

                return (
                  <tr
                    key={student.student_id}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                      backgroundColor: isSelected ? 'rgba(59,130,246,0.08)' : idx % 2 === 1 ? headerBg : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(student.student_id)}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: textColor }}>{student.student_name}</div>
                      <div style={{ fontSize: 11, color: subtextColor }}>
                        Adm: {student.admission_no} {student.roll_number ? `· Roll: ${student.roll_number}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: textColor, fontWeight: 500 }}>
                      Class {student.class_name} - {student.section_name}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ color: textColor, fontWeight: 500 }}>{student.father_name}</div>
                      {student.contact_number ? (
                        <div style={{ fontSize: 11, color: subtextColor }}>{student.contact_number}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: textColor }}>
                      {formatInr(student.total_fee)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#059669', fontWeight: 600 }}>
                      {formatInr(student.paid_amount)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: subtextColor }}>
                      {student.concession_amount > 0 ? formatInr(student.concession_amount) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: '#DC2626', fontSize: 14 }}>
                      {formatInr(student.due_amount)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: subtextColor }}>
                      {student.earliest_due_date || '—'}
                      {student.is_overdue && (
                        <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>
                          ({student.overdue_days}d overdue)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          title="Generate Slip"
                          onClick={() => onSingleGenerate(student)}
                          style={{
                            backgroundColor: '#3B82F6',
                            border: 'none',
                            color: '#FFFFFF',
                            padding: '5px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                        </button>
                        <button
                          title="Print"
                          onClick={() => onSinglePrint(student)}
                          style={{
                            backgroundColor: '#E2E8F0',
                            border: 'none',
                            color: '#1E293B',
                            padding: '5px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="print-outline" size={14} color="#1E293B" />
                        </button>
                        <button
                          title="Preview"
                          onClick={() => onSinglePreview(student)}
                          style={{
                            backgroundColor: '#E2E8F0',
                            border: 'none',
                            color: '#1E293B',
                            padding: '5px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="eye-outline" size={14} color="#1E293B" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Pagination Footer */}
      <View style={[styles.paginationRow, { borderTopColor: borderColor, backgroundColor: headerBg }]}>
        <Text style={[styles.pageInfoText, { color: subtextColor }]}>
          Showing {students.length} students {totalPages > 0 ? `· Page ${page} of ${totalPages}` : ''}
        </Text>
        {totalPages > 1 && (
          <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              onPress={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={16} color={page <= 1 ? '#94A3B8' : textColor} />
              <Text style={[styles.pageBtnText, { color: page <= 1 ? '#94A3B8' : textColor }]}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              onPress={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <Text style={[styles.pageBtnText, { color: page >= totalPages ? '#94A3B8' : textColor }]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? '#94A3B8' : textColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryMetricText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPill: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  selectVisibleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  selectVisibleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  bulkActionBar: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  bulkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryActionText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '700',
  },
  bulkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDesc: {
    fontSize: 13,
  },
  paginationRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
