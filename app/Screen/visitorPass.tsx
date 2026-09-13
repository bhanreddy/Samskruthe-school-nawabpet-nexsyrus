import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { visitorService, type VisitorRequest } from '@/src/services/visitorService';

export default function VisitorPassScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string; passCode?: string; token?: string }>();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VisitorRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestId = params.requestId;

  const loadPass = async () => {
    if (!requestId) {
      setError('Missing pass reference ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await visitorService.getVisitorRequest(requestId);
      setRequest(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load pass details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPass();
  }, [requestId]);

  const onSharePass = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!request) return;
    try {
      const code = request.pass_code || 'PASS';
      const msg = `Campus Visitor Pass: ${code}\nVisitor: ${request.visitor_name}\nDate: ${request.visit_date} (${request.start_time} - ${request.end_time})\nPurpose: ${request.purpose}\nPlease show this pass at the security gate for campus entry.`;
      await Share.share({
        message: msg,
        title: `Campus Visitor Pass - ${code}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const bgColor = isDark ? '#0B0F17' : '#F4F6F9';
  const cardBg = isDark ? '#161E2E' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const subColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#26334A' : '#E2E8F0';

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: subColor }]}>Loading your digital pass...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !request) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Visitor Pass</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: textColor }]}>Pass Unavailable</Text>
          <Text style={[styles.errorMsg, { color: subColor }]}>{error || 'Pass could not be retrieved.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadPass}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const passCode = request.pass_code || `REQ-${request.id.slice(0, 8).toUpperCase()}`;
  const qrValue = params.token || request.qrToken || passCode;
  const isExpired = request.pass_status === 'EXPIRED' || request.pass_status === 'REVOKED' || request.approval_status === 'CANCELLED' || request.approval_status === 'REJECTED';
  const isCheckedIn = request.approval_status === 'CHECKED_IN';
  const isApproved = request.approval_status === 'APPROVED';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Digital Access Pass</Text>
        <TouchableOpacity style={styles.shareButton} onPress={onSharePass}>
          <Ionicons name="share-social-outline" size={22} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Access Card */}
        <View style={[styles.passContainer, { backgroundColor: cardBg, borderColor }]}>
          {/* Card Top Banner */}
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardHeaderGradient}
          >
            <View style={styles.badgeRow}>
              <View style={styles.schoolTag}>
                <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.schoolTagText}>OFFICIAL ACCESS PERMIT</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {isCheckedIn ? 'ON CAMPUS' : isApproved ? 'APPROVED' : request.approval_status}
                </Text>
              </View>
            </View>
            <Text style={styles.cardCampusTitle}>CAMPUS VISITOR PASS</Text>
            <Text style={styles.cardPassCode}>{passCode}</Text>
          </LinearGradient>

          {/* QR Code Container */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrInner}>
              <QRCode
                value={isExpired ? `void:${passCode}` : qrValue}
                size={180}
                color={isExpired ? '#94A3B8' : '#0F172A'}
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrHelperText}>Scan at security kiosk or gate barrier</Text>
          </View>

          {/* Dashed Separator */}
          <View style={styles.dashedDivider} />

          {/* Pass Details */}
          <View style={styles.detailsBlock}>
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={[styles.metaLabel, { color: subColor }]}>VISITOR NAME</Text>
                <Text style={[styles.metaValue, { color: textColor }]}>{request.visitor_name}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={[styles.metaLabel, { color: subColor }]}>CATEGORY</Text>
                <Text style={[styles.metaValue, { color: textColor }]}>{request.visitor_type || 'Parent'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={[styles.metaLabel, { color: subColor }]}>DATE OF VISIT</Text>
                <Text style={[styles.metaValue, { color: textColor }]}>{request.visit_date}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={[styles.metaLabel, { color: subColor }]}>ENTRY WINDOW</Text>
                <Text style={[styles.metaValue, { color: textColor }]}>
                  {request.start_time} - {request.end_time}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <Text style={[styles.metaLabel, { color: subColor }]}>DEPARTMENT / HOST</Text>
                <Text style={[styles.metaValue, { color: textColor }]}>
                  {request.destination_department || request.host_name || 'Class Teacher'}
                </Text>
              </View>
              {request.student_name ? (
                <View style={styles.detailCol}>
                  <Text style={[styles.metaLabel, { color: subColor }]}>STUDENT</Text>
                  <Text style={[styles.metaValue, { color: textColor }]}>
                    {request.student_name} ({request.student_admission_no || 'Enrolled'})
                  </Text>
                </View>
              ) : null}
            </View>

            {request.vehicle_number ? (
              <View style={styles.vehiclePill}>
                <Ionicons name="car-outline" size={16} color="#10B981" />
                <Text style={[styles.vehicleText, { color: textColor }]}>
                  Authorized Vehicle: <Text style={styles.bold}>{request.vehicle_number}</Text>
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Security Notice Card */}
        <View style={[styles.instructionsCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text style={[styles.instructionsTitle, { color: textColor }]}>Campus Gate Instructions</Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.bulletText, { color: subColor }]}>
              Present this digital pass at Gate 1 or designated Visitor Entrance.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.bulletText, { color: subColor }]}>
              Keep a government-issued photo ID handy for identity verification.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={[styles.bulletText, { color: subColor }]}>
              Check out with the gate officer before departing campus premises.
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor }]}
            onPress={onSharePass}
          >
            <Ionicons name="share-outline" size={18} color="#10B981" />
            <Text style={[styles.actionBtnText, { color: textColor }]}>Share Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryActionBtn]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryActionBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
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
  backButton: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  shareButton: { padding: 6 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  errorMsg: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  passContainer: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeaderGradient: {
    padding: 20,
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  schoolTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  cardCampusTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  cardPassCode: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 4,
  },
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  qrInner: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrHelperText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  detailsBlock: {
    padding: 18,
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  vehicleText: {
    fontSize: 13,
  },
  bold: {
    fontWeight: '700',
  },
  instructionsCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
