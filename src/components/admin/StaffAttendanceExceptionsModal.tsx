import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiClient';
import * as Haptics from '../../utils/haptics';

interface ExceptionRequest {
  id: string;
  staff_id: string;
  staff_name?: string;
  attendance_date: string;
  action: 'check_in' | 'check_out';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface Props {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
}

export default function StaffAttendanceExceptionsModal({
  visible,
  isDark,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [exceptions, setExceptions] = useState<ExceptionRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadExceptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ExceptionRequest[]>('/attendance/v2/admin/exceptions');
      setExceptions(res || []);
    } catch (err) {
      console.warn('Failed to load exceptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadExceptions();
    }
  }, [visible, loadExceptions]);

  const handleResolve = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setActionLoading(id);
      await api.post(`/attendance/v2/admin/exceptions/${id}/review`, {
        decision: status,
        notes: `Marked ${status} by administrator`,
        ...(status === 'approved' ? { mark_status: 'present' } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Exception Resolved', `Request marked as ${status}.`);
      await loadExceptions();
    } catch (err: any) {
      Alert.alert('Resolution Failed', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const cardBg = isDark ? '#161929' : '#FFFFFF';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderClr }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Attendance Exceptions</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Review requests submitted by staff with GPS or hardware issues
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : exceptions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={40} color="#10B981" />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No pending exception requests.
              </Text>
            </View>
          ) : (
            <FlatList
              data={exceptions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.exCard, { backgroundColor: isDark ? '#1C2138' : '#F8FAFC', borderColor: borderClr }]}>
                  <View style={styles.exTop}>
                    <View>
                      <Text style={[styles.staffName, { color: textPrimary }]}>
                        {item.staff_name || 'Staff Member'}
                      </Text>
                      <Text style={[styles.categoryTag, { color: '#6366F1' }]}>
                        Action: {item.action.replace('_', ' ').toUpperCase()} • {item.attendance_date}
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={[styles.reasonText, { color: textPrimary }]}>
                    “{item.reason}”
                  </Text>

                  {item.status === 'pending' && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        disabled={actionLoading === item.id}
                        onPress={() => handleResolve(item.id, 'approved')}
                        style={[styles.btn, styles.approveBtn]}
                      >
                        <Text style={styles.btnText}>Approve Exception</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={actionLoading === item.id}
                        onPress={() => handleResolve(item.id, 'rejected')}
                        style={[styles.btn, styles.rejectBtn]}
                      >
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
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
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loaderBox: {
    padding: 50,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 10,
  },
  exCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  exTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#6B7280',
  },
});
