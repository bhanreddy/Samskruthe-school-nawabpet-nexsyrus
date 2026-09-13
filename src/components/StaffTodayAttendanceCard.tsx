import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { staffAttendanceV2Client, TodayAttendanceStatus } from '../services/staffAttendanceV2Client';
import * as Haptics from '../utils/haptics';

interface Props {
  isDark: boolean;
  isViewingAsAdmin?: boolean;
  onAttendanceSuccess?: () => void;
  autoAction?: 'check_in' | 'check_out' | null;
}

export default function StaffTodayAttendanceCard({
  isDark,
  isViewingAsAdmin,
  onAttendanceSuccess,
  autoAction,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TodayAttendanceStatus | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionProgress, setActionProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Exception modal
  const [exceptionModalVisible, setExceptionModalVisible] = useState(false);
  const [exceptionCategory, setExceptionCategory] = useState<'biometric_failure' | 'geofence_indoor' | 'device_issue' | 'other'>('geofence_indoor');
  const [exceptionReason, setExceptionReason] = useState('');
  const [submittingException, setSubmittingException] = useState(false);

  // Load authoritative today state
  const loadStatus = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setErrorMessage(null);
      const res = await staffAttendanceV2Client.getTodayStatus();
      setStatus(res);
    } catch (err: any) {
      console.warn('Failed to load today staff attendance:', err);
      setErrorMessage('Could not load authoritative attendance state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // AppState refresh
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        loadStatus(true);
      }
    });
    return () => sub.remove();
  }, [loadStatus]);

  // Handle autoAction parameter if triggered from dashboard
  useEffect(() => {
    if (autoAction && status && !actionLoading) {
      if (autoAction === 'check_in' && status.can_check_in) {
        handleCheckIn();
      } else if (autoAction === 'check_out' && status.can_check_out) {
        handleCheckOut();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAction, status?.can_check_in, status?.can_check_out]);

  const handleCheckIn = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setActionLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await staffAttendanceV2Client.performCheckIn((step) => {
        setActionProgress(step);
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage('✓ Check-in verified and confirmed by server!');
      await loadStatus(true);
      onAttendanceSuccess?.();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await loadStatus(true);
      setErrorMessage(err.message || 'Check-in verification failed.');
    } finally {
      setActionLoading(false);
      setActionProgress(null);
    }
  };

  const handleCheckOut = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setActionLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await staffAttendanceV2Client.performCheckOut((step) => {
        setActionProgress(step);
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage('✓ Check-out verified and confirmed by server!');
      await loadStatus(true);
      onAttendanceSuccess?.();
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await loadStatus(true);
      setErrorMessage(err.message || 'Check-out verification failed.');
    } finally {
      setActionLoading(false);
      setActionProgress(null);
    }
  };

  const handleRegisterDevice = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setActionLoading(true);
      setActionProgress('Generating hardware-backed key pair...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await staffAttendanceV2Client.registerThisDevice();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage('✓ Device registered! Waiting for administrator approval.');
      await loadStatus(true);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(err.message || 'Device registration failed.');
    } finally {
      setActionLoading(false);
      setActionProgress(null);
    }
  };

  const handleReplaceDevice = async () => {
    Alert.alert(
      'Replace Registered Device',
      'This will submit a replacement request for this device and deactivate your previous phone upon admin approval. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              setErrorMessage(null);
              setSuccessMessage(null);
              setActionLoading(true);
              setActionProgress('Preparing replacement key...');
              await staffAttendanceV2Client.replaceDevice();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSuccessMessage('✓ Replacement registered! Awaiting admin approval.');
              await loadStatus(true);
            } catch (err: any) {
              setErrorMessage(err.message || 'Device replacement failed.');
            } finally {
              setActionLoading(false);
              setActionProgress(null);
            }
          },
        },
      ]
    );
  };

  const handleSubmitException = async () => {
    if (!exceptionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a description for this exception request.');
      return;
    }
    try {
      setSubmittingException(true);
      if (!status?.attendance_date) throw new Error('Attendance date is not available. Refresh and try again.');
      const action = status.check_in_at ? 'check_out' : 'check_in';
      const categoryLabel = exceptionCategory.replaceAll('_', ' ');
      await staffAttendanceV2Client.submitException(
        status.attendance_date,
        action,
        `${categoryLabel}: ${exceptionReason.trim()}`
      );
      setExceptionModalVisible(false);
      setExceptionReason('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Exception Submitted', 'Your attendance exception request was submitted to the administration.');
      await loadStatus(true);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit exception request.');
    } finally {
      setSubmittingException(false);
    }
  };

  const cardBg = isDark ? '#141829' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  const formatTime = (ts?: string | null) => {
    if (!ts) return null;
    try {
      return new Date(ts).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return null;
    }
  };

  const checkInTimeStr = formatTime(status?.check_in_at);
  const checkOutTimeStr = formatTime(status?.check_out_at);

  if (isViewingAsAdmin) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.viewAsNotice}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={[styles.viewAsText, { color: textSecondary }]}>
            Staff Attendance V2 requires physical hardware biometric signing on the staff member&apos;s approved phone. Mobile self-attendance cannot be marked via Admin View As.
          </Text>
        </View>
      </View>
    );
  }

  if (loading && !status) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, alignItems: 'center', padding: 28 }]}>
        <ActivityIndicator size="small" color="#6366F1" />
        <Text style={[styles.progressText, { color: textSecondary, marginTop: 10 }]}>Loading attendance status...</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(450)} style={styles.wrapper}>
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
          Platform.OS === 'web'
            ? { boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(100,116,139,0.12)' }
            : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.35 : 0.08, shadowRadius: 16, elevation: 5 },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(99, 102, 241, 0.14)', 'rgba(20, 24, 41, 0)']
              : ['rgba(99, 102, 241, 0.07)', 'rgba(255, 255, 255, 0)']
          }
          style={StyleSheet.absoluteFill}
        />

        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#272E4F' : '#EEF2FF' }]}>
              <MaterialCommunityIcons name="shield-check" size={22} color="#6366F1" />
            </View>
            <View>
              <Text style={[styles.dateTitle, { color: textPrimary }]}>
                {status?.attendance_date
                  ? new Date(status.attendance_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : "Today's Attendance"}
              </Text>
              <Text style={[styles.campusSub, { color: textSecondary }]}>
                {typeof status?.campus === 'object' && status?.campus?.name
                  ? `${status.campus.name} Campus`
                  : typeof status?.campus === 'string'
                  ? status.campus
                  : 'Biometric Geofence'}
              </Text>
            </View>
          </View>

          {/* Verification Source Badge */}
          {status?.verification_source ? (
            <View style={[styles.sourceBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={[styles.sourceBadgeText, { color: '#10B981' }]}>
                {status.verification_source === 'mobile_v2'
                  ? 'Verified Mobile'
                  : status.verification_source === 'admin_manual'
                  ? 'Admin Marked'
                  : status.verification_source === 'admin_correction'
                  ? 'Admin Corrected'
                  : status.verification_source}
              </Text>
            </View>
          ) : status?.enforcement_mode !== 'disabled' && status?.device_registration_status !== 'approved' ? (
            <View style={[styles.sourceBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
              <Ionicons name="alert-circle" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={[styles.sourceBadgeText, { color: '#F59E0B' }]}>
                {status?.device_registration_status === 'none'
                  ? 'Setup Required'
                  : status?.device_registration_status === 'pending'
                  ? 'Pending Approval'
                  : 'Invalidated'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Time Tracking Row */}
        <View style={styles.timeRow}>
          <View style={styles.timeCell}>
            <View style={styles.timeIconWrap}>
              <Ionicons name="log-in-outline" size={16} color="#10B981" />
              <Text style={[styles.timeLabel, { color: textSecondary }]}>Check In</Text>
            </View>
            <Text style={[styles.timeVal, { color: textPrimary }]}>{checkInTimeStr || '—:—'}</Text>
          </View>

          <View style={[styles.timeSeparator, { backgroundColor: cardBorder }]} />

          <View style={styles.timeCell}>
            <View style={styles.timeIconWrap}>
              <Ionicons name="log-out-outline" size={16} color="#F59E0B" />
              <Text style={[styles.timeLabel, { color: textSecondary }]}>Check Out</Text>
            </View>
            <Text style={[styles.timeVal, { color: textPrimary }]}>{checkOutTimeStr || '—:—'}</Text>
          </View>
        </View>

        {/* Messages / Progress Alerts */}
        {actionProgress && (
          <View style={[styles.progressBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}>
            <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 8 }} />
            <Text style={[styles.progressText, { color: '#6366F1' }]}>{actionProgress}</Text>
          </View>
        )}

        {errorMessage && (
          <View style={[styles.alertBox, styles.errorBox]}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.alertErrorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={[styles.alertBox, styles.successBox]}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.alertSuccessText}>{successMessage}</Text>
          </View>
        )}

        {/* Device Registration Notices & Controls */}
        {status?.enforcement_mode === 'disabled' && (
          <View style={styles.deviceNoticeBox}>
            <Text style={[styles.deviceNoticeText, { color: textSecondary }]}>
              Mobile staff attendance is currently disabled by your school administrator.
            </Text>
          </View>
        )}

        {status?.enforcement_mode !== 'disabled' && status?.device_registration_status === 'none' && (
          <View style={styles.deviceNoticeBox}>
            <Text style={[styles.deviceNoticeText, { color: textSecondary }]}>
              This mobile device has not been registered with SchoolIMS. Register this phone using your biometric key to enable verified self-attendance.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={actionLoading}
              onPress={handleRegisterDevice}
              style={[styles.primaryActionBtn, { backgroundColor: '#6366F1' }]}
            >
              <Ionicons name="finger-print" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Register This Phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {status?.enforcement_mode !== 'disabled' && status?.device_registration_status === 'pending' && (
          <View style={styles.deviceNoticeBox}>
            <Text style={[styles.deviceNoticeText, { color: textSecondary }]}>
              Your device registration has been submitted and is pending administrator verification. Please contact your school administrator to approve this device.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => loadStatus(false)}
              style={[styles.secondaryActionBtn, { borderColor: cardBorder }]}
            >
              <Ionicons name="refresh" size={16} color={textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.secondaryActionText, { color: textPrimary }]}>Check Approval Status</Text>
            </TouchableOpacity>
          </View>
        )}

        {status?.enforcement_mode !== 'disabled' && ['invalidated', 'rejected', 'revoked', 'replaced'].includes(status?.device_registration_status || '') && (
          <View style={styles.deviceNoticeBox}>
            <Text style={[styles.deviceNoticeText, { color: '#EF4444' }]}>
              This phone&apos;s attendance registration is no longer active. Re-register it and ask an administrator to approve the new request.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={actionLoading}
              onPress={handleRegisterDevice}
              style={[styles.primaryActionBtn, { backgroundColor: '#DC2626' }]}
            >
              <Ionicons name="finger-print" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>Re-register Device</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Interactive Self-Attendance Action Buttons */}
        {status?.enforcement_mode !== 'disabled' && status?.device_registration_status === 'approved' && (
          <View style={styles.actionContainer}>
            {status.is_finalized ? (
              <View style={[styles.finalizedBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5' }]}>
                <Ionicons name="lock-closed" size={18} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.finalizedText, { color: '#047857' }]}>
                  Attendance finalized for today ({status.daily_status?.toUpperCase()}).
                </Text>
              </View>
            ) : status.can_check_in ? (
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={actionLoading}
                onPress={handleCheckIn}
                style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
              >
                <Ionicons name="log-in" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Verified Check In</Text>
              </TouchableOpacity>
            ) : status.can_check_out ? (
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={actionLoading}
                onPress={handleCheckOut}
                style={[styles.primaryActionBtn, { backgroundColor: '#D97706' }]}
              >
                <Ionicons name="log-out" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Verified Check Out</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.completedBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#D1FAE5' }]}>
                <Ionicons name={status.check_out_at ? 'checkmark-done' : 'time-outline'} size={18} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.completedText, { color: '#047857' }]}>
                  {status.check_out_at
                    ? 'You are checked out for today.'
                    : status.check_in_at
                    ? 'Check-out is unavailable outside the configured window.'
                    : 'Check-in is unavailable outside the configured window.'}
                </Text>
              </View>
            )}

            {/* Exception & Options Row */}
            <View style={styles.footerOptionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExceptionModalVisible(true)}
                style={styles.textOptionBtn}
              >
                <Ionicons name="help-circle-outline" size={15} color={textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.textOptionText, { color: textSecondary }]}>Request Exception</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleReplaceDevice}
                style={styles.textOptionBtn}
              >
                <Ionicons name="phone-portrait-outline" size={15} color={textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.textOptionText, { color: textSecondary }]}>Replace Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Exception Request Modal */}
      <Modal
        visible={exceptionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExceptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E2337' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Attendance Exception</Text>
              <TouchableOpacity onPress={() => setExceptionModalVisible(false)}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
              Submit an auditable exception request if you are facing GPS or hardware biometric issues on campus.
            </Text>

            {/* Category Selectors */}
            <View style={styles.catWrap}>
              {(
                [
                  { key: 'geofence_indoor', label: 'Indoor / Weak GPS' },
                  { key: 'biometric_failure', label: 'Biometrics Failed' },
                  { key: 'device_issue', label: 'Phone / Key Issue' },
                  { key: 'other', label: 'Other' },
                ] as const
              ).map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setExceptionCategory(cat.key)}
                  style={[
                    styles.catChip,
                    exceptionCategory === cat.key && styles.catChipActive,
                    { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: exceptionCategory === cat.key ? '#6366F1' : textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reason input */}
            <TextInput
              style={[
                styles.reasonInput,
                {
                  color: textPrimary,
                  backgroundColor: isDark ? '#141829' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                },
              ]}
              placeholder="Explain the situation in detail..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8'}
              multiline
              numberOfLines={4}
              value={exceptionReason}
              onChangeText={setExceptionReason}
            />

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={submittingException}
              onPress={handleSubmitException}
              style={[styles.primaryActionBtn, { backgroundColor: '#6366F1', marginTop: 16 }]}
            >
              {submittingException ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionText}>Submit Exception Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  viewAsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  viewAsText: {
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  campusSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: 16,
  },
  timeCell: {
    alignItems: 'center',
    flex: 1,
  },
  timeIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },
  timeVal: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  timeSeparator: {
    width: 1,
    height: 32,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  alertErrorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  alertSuccessText: {
    color: '#10B981',
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  deviceNoticeBox: {
    paddingVertical: 6,
  },
  deviceNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  actionContainer: {
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  finalizedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
  },
  finalizedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  completedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  textOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  textOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: '#6366F1',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
