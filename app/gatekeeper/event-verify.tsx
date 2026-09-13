import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { eventService, type EventPassValidation } from '@/src/services/eventService';
import { eventOfflineQueue } from '@/src/services/eventOfflineQueue';

export default function GatekeeperEventVerifyScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [admitting, setAdmitting] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [validation, setValidation] = useState<EventPassValidation | null>(null);

  const verifyToken = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await eventService.validatePassToken(token);
      setValidation(res?.data || { isValid: false, message: 'Invalid pass format' });
      if (res?.data?.isValid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err: any) {
      setValidation({
        isValid: false,
        reason: 'OFFLINE',
        message: 'Network offline. You can admit offline to queue synchronization.',
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleAdmit = async () => {
    if (!token) return;
    try {
      setAdmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      await eventService.checkInPass({
        token,
        scanType: 'GATE_ENTRY',
        verificationMethod: 'QR_SCAN',
      });

      setAdmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      // If network fails, queue it
      await eventOfflineQueue.enqueue('GATE_CHECKIN', validation?.pass?.event_id || 'offline', {
        token,
        scanType: 'GATE_ENTRY',
        verificationMethod: 'QR_SCAN',
      });
      setAdmitted(true);
      Alert.alert('Admitted (Offline)', 'Check-in saved to device queue. Will synchronize when online.');
    } finally {
      setAdmitting(false);
    }
  };

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F9FAFB' : '#0F172A';
  const subCol = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.centerText, { color: subCol }]}>Validating Event Pass...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pass = validation?.pass;
  const isValid = validation?.isValid;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/gatekeeper/scanner')}>
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textCol }]}>Event Gatekeeper Entry</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Indicator Card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: admitted
                ? '#064E3B'
                : isValid
                ? isDark
                  ? 'rgba(16,185,129,0.15)'
                  : '#ECFDF5'
                : isDark
                ? 'rgba(239,68,68,0.15)'
                : '#FEF2F2',
              borderColor: admitted || isValid ? '#10B981' : '#EF4444',
            },
          ]}
        >
          <Ionicons
            name={admitted || isValid ? 'checkmark-circle' : 'alert-circle'}
            size={48}
            color={admitted ? '#FFF' : isValid ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.statusTitle,
              { color: admitted ? '#FFF' : isValid ? '#10B981' : '#EF4444' },
            ]}
          >
            {admitted ? 'ADMISSION CONFIRMED' : isValid ? 'VALID PASS' : 'ADMISSION BLOCKED'}
          </Text>
          <Text style={[styles.statusMsg, { color: admitted ? 'rgba(255,255,255,0.8)' : subCol }]}>
            {admitted ? 'Attendee admitted and logged in event register' : validation?.message}
          </Text>
        </View>

        {/* Pass Details Card */}
        {pass && (
          <View style={[styles.passCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.passCodePill}>
                <Ionicons name="qr-code" size={13} color="#4F46E5" />
                <Text style={styles.passCodeText}>{pass.pass_code}</Text>
              </View>
              <Text style={[styles.attendeeType, { color: subCol }]}>{pass.attendee_type}</Text>
            </View>

            <Text style={[styles.attendeeName, { color: textCol }]}>
              {pass.attendee_name || 'Event Attendee'}
            </Text>
            {pass.admission_no && (
              <Text style={[styles.subDetail, { color: subCol }]}>
                Admission No: {pass.admission_no} • {pass.class_name || 'Class Assigned'}
              </Text>
            )}

            <View style={[styles.divider, { backgroundColor: borderCol }]} />

            <View style={styles.infoRow}>
              <Ionicons name="trophy-outline" size={16} color="#6366F1" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: subCol }]}>Event</Text>
                <Text style={[styles.infoVal, { color: textCol }]}>{pass.event_title}</Text>
              </View>
            </View>

            {pass.location && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#EC4899" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: subCol }]}>Venue</Text>
                  <Text style={[styles.infoVal, { color: textCol }]}>{pass.location}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={16} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: subCol }]}>Entry Count</Text>
                <Text style={[styles.infoVal, { color: textCol }]}>
                  {pass.entry_count} of {pass.max_entries} entries used
                </Text>
              </View>
            </View>

            {pass.consent_status && (
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: subCol }]}>Parent Digital Consent</Text>
                  <Text style={[styles.infoVal, { color: pass.consent_status === 'CONSENTED' ? '#10B981' : '#EF4444' }]}>
                    {pass.consent_status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Button */}
        {!admitted && (
          <View style={styles.actionWrap}>
            {isValid ? (
              <TouchableOpacity
                style={styles.admitBtn}
                onPress={handleAdmit}
                disabled={admitting}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.admitGrad}
                >
                  {admitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.admitBtnText}>Admit & Check In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.overrideBtn, { borderColor: '#EF4444' }]}
                onPress={() => {
                  Alert.alert(
                    'Manual Security Override',
                    'Are you sure you want to manually admit this participant despite blocked conditions?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Override & Admit', style: 'destructive', onPress: handleAdmit },
                    ]
                  );
                }}
              >
                <Text style={styles.overrideBtnText}>Manual Security Override</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.nextScanBtn}
              onPress={() => router.replace('/gatekeeper/scanner')}
            >
              <Text style={[styles.nextScanText, { color: subCol }]}>Scan Next Pass</Text>
            </TouchableOpacity>
          </View>
        )}

        {admitted && (
          <TouchableOpacity
            style={styles.scanAnotherBtn}
            onPress={() => router.replace('/gatekeeper/scanner')}
          >
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.admitGrad}
            >
              <Ionicons name="scan" size={20} color="#FFF" />
              <Text style={styles.admitBtnText}>Scan Next Pass</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '800' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  statusCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  statusTitle: { fontSize: 18, fontWeight: '900', marginTop: 8, letterSpacing: 0.5 },
  statusMsg: { fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  passCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  passCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(79,70,229,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  passCodeText: { color: '#4F46E5', fontSize: 12, fontWeight: '800' },
  attendeeType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  attendeeName: { fontSize: 20, fontWeight: '900', marginTop: 4 },
  subDetail: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  infoVal: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  actionWrap: { gap: 10 },
  admitBtn: { borderRadius: 14, overflow: 'hidden' },
  scanAnotherBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 10 },
  admitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  admitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  overrideBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  overrideBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
  nextScanBtn: { paddingVertical: 12, alignItems: 'center' },
  nextScanText: { fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 13, marginTop: 10 },
});
