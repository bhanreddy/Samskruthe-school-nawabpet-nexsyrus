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
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/apiClient';
import * as Haptics from '../../utils/haptics';

interface DeviceRegistration {
  id: string;
  staff_id: string;
  staff_name?: string;
  canonical_person_id: string;
  device_model?: string;
  os_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked' | 'replaced';
  device_session_public_key: string;
  created_at: string;
  approved_at?: string;
  revoked_at?: string;
}

interface Props {
  visible: boolean;
  isDark: boolean;
  onClose: () => void;
}

export default function StaffDeviceManagementModal({
  visible,
  isDark,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<DeviceRegistration[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Revocation modal state
  const [revokeTarget, setRevokeTarget] = useState<DeviceRegistration | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<DeviceRegistration[]>('/attendance/v2/admin/registrations');
      setDevices(res || []);
    } catch (err) {
      console.warn('Failed to load staff devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadDevices();
    }
  }, [visible, loadDevices]);

  const handleApprove = async (device: DeviceRegistration) => {
    Alert.alert(
      'Approve Staff Device',
      `Approve ${device.device_model || device.os_name || 'this phone'} as the sole authorized attendance phone for ${device.staff_name || 'this staff member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Device',
          onPress: async () => {
            try {
              setActionLoading(device.id);
              await api.post(`/attendance/v2/admin/registrations/${device.id}/approve`, {});
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Device Approved', 'Staff member can now perform verified mobile attendance.');
              await loadDevices();
            } catch (err: any) {
              Alert.alert('Approval Failed', err.message || 'Could not approve device.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (device: DeviceRegistration) => {
    if (Platform.OS === 'ios' && Alert.prompt) {
      Alert.prompt(
          'Reject Registration',
          'Enter reason for rejecting this device registration:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (reason?: string) => {
                await executeReject(device.id, reason || 'Rejected by administrator');
              },
            },
          ]
        );
    } else {
      await executeReject(device.id, 'Rejected by administrator');
    }
  };

  const executeReject = async (id: string, reason: string) => {
    try {
      setActionLoading(id);
      await api.post(`/attendance/v2/admin/registrations/${id}/reject`, { reason });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadDevices();
    } catch (err: any) {
      Alert.alert('Rejection Failed', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a revocation reason (e.g. lost phone, staff departure, replacement).');
      return;
    }

    try {
      setActionLoading(revokeTarget.id);
      await api.post(`/attendance/v2/admin/registrations/${revokeTarget.id}/revoke`, {
        reason: revokeReason.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Device Revoked', 'Authorization immediately terminated across all active sessions.');
      setRevokeTarget(null);
      setRevokeReason('');
      await loadDevices();
    } catch (err: any) {
      Alert.alert('Revocation Failed', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const cardBg = isDark ? '#161929' : '#FFFFFF';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  const filteredDevices = devices.filter((d) => {
    if (selectedTab === 'pending') return d.status === 'pending';
    if (selectedTab === 'approved') return d.status === 'approved';
    return true;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderClr }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Device Authorizations</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Hardware biometric key registrations (1 device per staff member)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Filter */}
          <View style={styles.tabRow}>
            {(['pending', 'approved', 'all'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={[
                  styles.tabBtn,
                  selectedTab === tab && styles.tabBtnActive,
                  { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: selectedTab === tab ? '#6366F1' : textSecondary },
                  ]}
                >
                  {tab.toUpperCase()}{' '}
                  {tab === 'pending'
                    ? `(${devices.filter((d) => d.status === 'pending').length})`
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Device List */}
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : filteredDevices.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="phone-portrait-outline" size={40} color={textSecondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No {selectedTab} device registrations found.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredDevices}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isPending = item.status === 'pending';
                const isApproved = item.status === 'approved';
                const keySnippet = item.device_session_public_key
                  ? item.device_session_public_key.slice(0, 16) + '...' + item.device_session_public_key.slice(-8)
                  : 'Hardware Key';

                return (
                  <View style={[styles.deviceCard, { backgroundColor: isDark ? '#1C2138' : '#F8FAFC', borderColor: borderClr }]}>
                    <View style={styles.deviceCardTop}>
                      <View style={styles.deviceInfo}>
                        <Text style={[styles.staffName, { color: textPrimary }]}>
                          {item.staff_name || 'Staff Member'}
                        </Text>
                        <Text style={[styles.deviceDetails, { color: textSecondary }]}>
                          {item.device_model || item.os_name || 'Mobile device'} • Key: {keySnippet}
                        </Text>
                        <Text style={[styles.deviceMeta, { color: textSecondary }]}>
                          Requested: {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              item.status === 'approved'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : item.status === 'pending'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                item.status === 'approved'
                                  ? '#10B981'
                                  : item.status === 'pending'
                                  ? '#F59E0B'
                                  : '#EF4444',
                            },
                          ]}
                        >
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionsRow}>
                      {isPending && (
                        <>
                          <TouchableOpacity
                            disabled={actionLoading === item.id}
                            onPress={() => handleApprove(item)}
                            style={[styles.btn, styles.approveBtn]}
                          >
                            <Ionicons name="checkmark" size={15} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.btnText}>Approve</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            disabled={actionLoading === item.id}
                            onPress={() => handleReject(item)}
                            style={[styles.btn, styles.rejectBtn]}
                          >
                            <Ionicons name="close" size={15} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.btnText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {isApproved && (
                        <TouchableOpacity
                          disabled={actionLoading === item.id}
                          onPress={() => setRevokeTarget(item)}
                          style={[styles.btn, styles.revokeBtn]}
                        >
                          <Ionicons name="shield-outline" size={15} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[styles.btnText, { color: '#EF4444' }]}>Revoke Access</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Revocation Prompt Modal */}
          {revokeTarget && (
            <Modal visible transparent animationType="fade">
              <View style={styles.subBackdrop}>
                <View style={[styles.subCard, { backgroundColor: cardBg, borderColor: borderClr }]}>
                  <Text style={[styles.title, { color: textPrimary }]}>Revoke Device Authorization</Text>
                  <Text style={[styles.subtitle, { color: textSecondary, marginVertical: 8 }]}>
                    Revoking immediately invalidates all active sessions for {revokeTarget.staff_name}.
                  </Text>
                  <TextInput
                    style={[styles.input, { color: textPrimary, borderColor: borderClr }]}
                    placeholder="Enter mandatory reason for revocation..."
                    placeholderTextColor={textSecondary}
                    value={revokeReason}
                    onChangeText={setRevokeReason}
                  />
                  <View style={styles.subActions}>
                    <TouchableOpacity onPress={() => setRevokeTarget(null)} style={styles.cancelBtn}>
                      <Text style={{ color: textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleConfirmRevoke} style={styles.confirmRevokeBtn}>
                      <Text style={{ color: '#FFF', fontWeight: '700' }}>Confirm Revocation</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loaderBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    marginTop: 10,
  },
  deviceCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  deviceCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
  },
  deviceDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  deviceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
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
  revokeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  subBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subCard: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  subActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    padding: 10,
  },
  confirmRevokeBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
