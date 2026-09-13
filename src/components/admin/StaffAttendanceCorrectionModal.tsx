import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiClient';
import * as Haptics from '../../utils/haptics';
import * as Crypto from 'expo-crypto';

interface StaffAttendanceRecord {
  staff_id: string;
  staff_name: string;
  designation?: string;
  status: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  verification_source?: string | null;
  is_finalized?: boolean;
}

interface Props {
  visible: boolean;
  staff: StaffAttendanceRecord | null;
  date: string;
  isDark: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StaffAttendanceCorrectionModal({
  visible,
  staff,
  date,
  isDark,
  onClose,
  onSuccess,
}: Props) {
  const [newStatus, setNewStatus] = useState<'present' | 'absent' | 'half_day'>('present');
  const [reason, setReason] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isReopenMode, setIsReopenMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (staff) {
      const current = (staff.status || 'absent') as 'present' | 'absent' | 'half_day';
      setNewStatus(current);
      setIsFinalized(!!staff.is_finalized);
      setIsReopenMode(false);
      setReason('');
      requestKeyRef.current = null;
    }
  }, [staff]);

  if (!staff) return null;

  const cardBg = isDark ? '#181C2E' : '#FFFFFF';
  const borderClr = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  const handleConfirmSubmit = () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Administrative attendance actions require a mandatory audit reason.');
      return;
    }

    const actionDescription = isReopenMode
      ? `REOPEN finalized attendance for ${staff.staff_name}`
      : `CHANGE attendance for ${staff.staff_name} from ${staff.status.toUpperCase()} to ${newStatus.toUpperCase()}`;

    Alert.alert(
      'Confirm Attendance Action',
      `${actionDescription}\n\nBefore: ${staff.status.toUpperCase()} (Source: ${staff.verification_source || 'legacy'})\nAfter: ${isReopenMode ? 'REOPENED (Mobile attendance permitted)' : newStatus.toUpperCase()}\n\nReason: "${reason.trim()}"\n\nThis action is permanently audited and directly impacts payroll records. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Apply',
          style: isReopenMode ? 'default' : 'destructive',
          onPress: executeAttendanceAction,
        },
      ]
    );
  };

  const executeAttendanceAction = async () => {
    try {
      setSubmitting(true);
      const idempotencyKey = requestKeyRef.current || Crypto.randomUUID();
      requestKeyRef.current = idempotencyKey;
      if (isReopenMode) {
        await api.post('/attendance/v2/admin/reopen', {
          staff_id: staff.staff_id,
          attendance_date: date,
          reason: reason.trim(),
          idempotency_key: idempotencyKey,
        });
      } else {
        await api.post('/attendance/v2/admin/correct', {
          staff_id: staff.staff_id,
          attendance_date: date,
          status: newStatus,
          reason: reason.trim(),
          is_finalized: isFinalized,
          idempotency_key: idempotencyKey,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Attendance Updated', 'The administrative change has been applied and audited.');
      requestKeyRef.current = null;
      onSuccess();
      onClose();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Action Failed', err.message || 'Could not update staff attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderClr }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>
                {isReopenMode ? 'Reopen Attendance' : 'Administrative Correction'}
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                {staff.staff_name} • {staff.designation || 'Staff'} • {date}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Concrete Before -> After Comparison Box */}
            <View style={[styles.comparisonBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' }]}>
              <View style={styles.comparisonCol}>
                <Text style={[styles.compLabel, { color: textSecondary }]}>CURRENT (BEFORE)</Text>
                <View style={[styles.statusTag, { backgroundColor: getStatusBg(staff.status, isDark) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(staff.status) }]}>
                    {staff.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.sourceNote, { color: textSecondary }]}>
                  Source: {staff.verification_source || 'manual'}
                </Text>
                {staff.is_finalized && (
                  <View style={styles.finalizedRow}>
                    <Ionicons name="lock-closed" size={12} color="#10B981" />
                    <Text style={styles.finalizedBadgeText}>Finalized</Text>
                  </View>
                )}
              </View>

              <View style={styles.arrowCol}>
                <Ionicons name="arrow-forward" size={20} color="#6366F1" />
              </View>

              <View style={styles.comparisonCol}>
                <Text style={[styles.compLabel, { color: textSecondary }]}>RESULT (AFTER)</Text>
                <View style={[styles.statusTag, { backgroundColor: getStatusBg(isReopenMode ? 'reopen' : newStatus, isDark) }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(isReopenMode ? 'reopen' : newStatus) }]}>
                    {isReopenMode ? 'REOPENED' : newStatus.toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.sourceNote, { color: textSecondary }]}>
                  Source: admin_correction
                </Text>
                {isFinalized && !isReopenMode && (
                  <View style={styles.finalizedRow}>
                    <Ionicons name="lock-closed" size={12} color="#10B981" />
                    <Text style={styles.finalizedBadgeText}>Locked for Payroll</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Reopen Toggle if already finalized */}
            {staff.is_finalized && (
              <TouchableOpacity
                onPress={() => setIsReopenMode(!isReopenMode)}
                style={[
                  styles.reopenToggle,
                  {
                    backgroundColor: isReopenMode
                      ? 'rgba(99, 102, 241, 0.15)'
                      : isDark
                      ? 'rgba(255,255,255,0.05)'
                      : '#F1F5F9',
                  },
                ]}
              >
                <Ionicons
                  name={isReopenMode ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color="#6366F1"
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.reopenToggleText, { color: textPrimary }]}>
                  Reopen this finalized record to allow mobile attendance
                </Text>
              </TouchableOpacity>
            )}

            {!isReopenMode && (
              <>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Select Corrected Status</Text>
                <View style={styles.statusPickerRow}>
                  {(['present', 'half_day', 'absent'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      onPress={() => setNewStatus(st)}
                      style={[
                        styles.statusPickerBtn,
                        newStatus === st && styles.statusPickerBtnActive,
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPickerText,
                          { color: newStatus === st ? '#6366F1' : textSecondary },
                        ]}
                      >
                        {st.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Finalize Toggle */}
                <TouchableOpacity
                  onPress={() => setIsFinalized(!isFinalized)}
                  style={styles.finalizeCheckboxRow}
                >
                  <Ionicons
                    name={isFinalized ? 'checkbox' : 'square-outline'}
                    size={20}
                    color="#6366F1"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={[styles.finalizeText, { color: textPrimary }]}>
                    Finalize & lock record (blocks further mobile self-attendance)
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Mandatory Reason Input */}
            <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 16 }]}>
              Audit Reason <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.reasonInput,
                {
                  color: textPrimary,
                  backgroundColor: isDark ? '#121524' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
                },
              ]}
              placeholder="e.g. Approved official duty, indoor campus GPS malfunction, payroll reconciliation"
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8'}
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.payrollWarning}>
              <Ionicons name="alert-circle" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={styles.payrollWarningText}>
                Changes are attributed to your administrator account and immediately affect daily attendance summaries and payroll calculation.
              </Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: borderClr }]}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={submitting}
              onPress={handleConfirmSubmit}
              style={[styles.submitBtn, { backgroundColor: isReopenMode ? '#4F46E5' : '#D97706' }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isReopenMode ? 'Reopen Attendance' : 'Apply Correction'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getStatusBg(status: string, isDark: boolean) {
  if (status === 'present') return isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5';
  if (status === 'half_day') return isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7';
  if (status === 'reopen') return isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF';
  return isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2';
}

function getStatusColor(status: string) {
  if (status === 'present') return '#10B981';
  if (status === 'half_day') return '#F59E0B';
  if (status === 'reopen') return '#6366F1';
  return '#EF4444';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  body: {
    padding: 18,
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  arrowCol: {
    paddingHorizontal: 8,
  },
  compLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sourceNote: {
    fontSize: 10,
    fontWeight: '500',
  },
  finalizedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  finalizedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 3,
  },
  reopenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  reopenToggleText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statusPickerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusPickerBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  statusPickerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  finalizeCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  finalizeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  reasonInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  payrollWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  payrollWarningText: {
    fontSize: 11,
    color: '#D97706',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
