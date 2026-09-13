import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { visitorService, type SchoolGate } from '@/src/services/visitorService';

export default function GatekeeperVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; validation?: string }>();
  const { isDark } = useTheme();

  const [currentGate, setCurrentGate] = useState<SchoolGate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemsCarried, setItemsCarried] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  let validationData: any = null;
  try {
    if (params.validation) {
      validationData = JSON.parse(params.validation);
    }
  } catch (e) {
    validationData = null;
  }

  const pass = validationData?.pass;
  const isValid = Boolean(validationData?.isValid);
  const isWatchlisted = Boolean(pass?.is_watchlisted || validationData?.watchlistAlert);

  useEffect(() => {
    visitorService.getMyGate().then((res) => {
      if (res?.currentGate) setCurrentGate(res.currentGate);
    });
    if (pass?.vehicle_number) {
      setVehicleNumber(pass.vehicle_number);
    }
  }, [pass]);

  const handleAllowEntry = async () => {
    if (!currentGate) {
      Alert.alert('Gate Required', 'Please ensure a security gate is selected.');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      await visitorService.checkInVisitor({
        passToken: params.token || pass?.pass_code,
        requestId: pass?.request_id,
        gateId: currentGate.id,
        vehicleNumber: vehicleNumber.trim() || undefined,
        itemsCarried: itemsCarried.trim() || undefined,
        notes: notes.trim() || undefined,
        verificationMethod: 'QR_SCAN',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Check-In Successful', `${pass?.visitor_name || 'Visitor'} has been checked in.`, [
        {
          text: 'Next Scan',
          onPress: () => router.replace('/gatekeeper/scanner' as any),
        },
        {
          text: 'Dashboard',
          onPress: () => router.replace('/gatekeeper/dashboard' as any),
        },
      ]);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Check-In Failed', err?.message || 'Could not complete check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDenyEntry = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.prompt
      ? Alert.prompt(
          'Deny Entry',
          'Specify the reason for refusing campus entry:',
          async (reason) => {
            if (reason) {
              await visitorService.reportIncident({
                incidentType: 'UNAUTHORIZED_ENTRY',
                severity: 'MEDIUM',
                title: `Entry Refused for ${pass?.visitor_name || 'Visitor'}`,
                description: `Gate: ${currentGate?.name || 'Gate 1'}. Reason: ${reason}`,
              }).catch(() => {});
            }
            router.replace('/gatekeeper/dashboard' as any);
          }
        )
      : Alert.alert('Entry Denied', 'Visitor has been turned away.', [
          { text: 'OK', onPress: () => router.replace('/gatekeeper/dashboard' as any) },
        ]);
  };

  const handleCallHost = () => {
    if (pass?.visitor_mobile) {
      Linking.openURL(`tel:${pass.visitor_mobile}`);
    } else {
      Alert.alert('No Phone Number', 'Contact phone number is not available for this record.');
    }
  };

  const bgColor = isDark ? '#0B0F17' : '#F4F6F9';
  const cardBg = isDark ? '#161E2E' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const subColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#26334A' : '#E2E8F0';

  if (!pass) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Pass Verification</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="close-circle-outline" size={60} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: textColor }]}>Invalid Pass</Text>
          <Text style={[styles.errorSub, { color: subColor }]}>
            {validationData?.message || 'The scanned QR pass is not valid or was not found in the system.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.replace('/gatekeeper/scanner' as any)}
          >
            <Text style={styles.retryBtnText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Gate Clearance Check</Text>
          <Text style={[styles.headerSub, { color: subColor }]}>{pass.pass_code}</Text>
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={handleCallHost}>
          <Ionicons name="call" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Watchlist Red Flashing Alert */}
        {isWatchlisted && (
          <View style={styles.watchlistAlertBox}>
            <Ionicons name="warning" size={26} color="#FFFFFF" />
            <View style={styles.watchlistTextCol}>
              <Text style={styles.watchlistTitle}>SECURITY WATCHLIST MATCH</Text>
              <Text style={styles.watchlistDesc}>
                {validationData?.watchlistAlert?.reason || 'This person is flagged on the security watchlist. DO NOT ADMIT.'}
              </Text>
            </View>
          </View>
        )}

        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isValid ? '#10B981' : '#EF4444',
            },
          ]}
        >
          <Ionicons
            name={isValid ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color="#FFFFFF"
          />
          <View style={styles.statusTextCol}>
            <Text style={styles.statusMainText}>
              {isValid ? 'VALID ENTRY PERMIT' : 'ACCESS RESTRICTED'}
            </Text>
            <Text style={styles.statusSubText}>
              {validationData?.message || (isValid ? 'Allowed entry into campus' : 'Pass not valid')}
            </Text>
          </View>
        </View>

        {/* Visitor Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.profileRow}>
            <View style={styles.photoContainer}>
              {pass.profile_photo_url ? (
                <Image source={{ uri: pass.profile_photo_url }} style={styles.visitorPhoto} />
              ) : (
                <Ionicons name="person" size={44} color="#10B981" />
              )}
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.visitorName, { color: textColor }]}>{pass.visitor_name}</Text>
              <Text style={[styles.visitorMobile, { color: subColor }]}>
                {pass.visitor_mobile} • {pass.visitor_type || 'Parent'}
              </Text>
              {pass.relationship ? (
                <Text style={[styles.visitorRel, { color: '#10B981' }]}>
                  Relationship: {pass.relationship}
                </Text>
              ) : null}
              {pass.id_reference_masked ? (
                <Text style={[styles.idRef, { color: subColor }]}>
                  ID: {pass.id_type || 'Govt ID'} ({pass.id_reference_masked})
                </Text>
              ) : null}
            </View>
          </View>

          {/* Student or Host Link */}
          <View style={[styles.hostBox, { borderColor }]}>
            {pass.student_name ? (
              <View style={styles.linkItem}>
                <Ionicons name="school-outline" size={18} color="#6366F1" />
                <Text style={[styles.linkText, { color: textColor }]}>
                  Student: <Text style={styles.bold}>{pass.student_name}</Text>
                  {pass.class_name ? ` (${pass.class_name}-${pass.section_name || ''})` : ''}
                </Text>
              </View>
            ) : null}
            {pass.destination_department || pass.host_name ? (
              <View style={styles.linkItem}>
                <Ionicons name="business-outline" size={18} color="#10B981" />
                <Text style={[styles.linkText, { color: textColor }]}>
                  Meeting: <Text style={styles.bold}>{pass.destination_department || pass.host_name}</Text>
                </Text>
              </View>
            ) : null}
          </View>

          {/* Visit Schedule info */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: subColor }]}>VISIT DATE</Text>
              <Text style={[styles.scheduleVal, { color: textColor }]}>{pass.visit_date || 'Today'}</Text>
            </View>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: subColor }]}>WINDOW</Text>
              <Text style={[styles.scheduleVal, { color: textColor }]}>
                {pass.start_time} - {pass.end_time}
              </Text>
            </View>
            <View style={styles.scheduleCol}>
              <Text style={[styles.scheduleLabel, { color: subColor }]}>ENTRY COUNT</Text>
              <Text style={[styles.scheduleVal, { color: textColor }]}>
                {pass.entry_count || 0} / {pass.max_entries || 1}
              </Text>
            </View>
          </View>
        </View>

        {/* Gate Entry Check Inputs */}
        <View style={[styles.entryFormCard, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.formTitle, { color: textColor }]}>Gate Security Log</Text>

          <Text style={[styles.inputLabel, { color: subColor }]}>VEHICLE NUMBER</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor }]}
            placeholder="e.g. KA-01-AB-1234"
            placeholderTextColor={subColor}
            autoCapitalize="characters"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />

          <Text style={[styles.inputLabel, { color: subColor }]}>ITEMS CARRIED</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor }]}
            placeholder="e.g. Laptop bag, Tools, Package"
            placeholderTextColor={subColor}
            value={itemsCarried}
            onChangeText={setItemsCarried}
          />

          <Text style={[styles.inputLabel, { color: subColor }]}>SECURITY NOTES (OPTIONAL)</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor }]}
            placeholder="e.g. Cleared with Principal's PA"
            placeholderTextColor={subColor}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.allowBtn, !isValid && styles.allowBtnDisabled]}
            onPress={handleAllowEntry}
            disabled={submitting}
          >
            <LinearGradient
              colors={isValid ? ['#059669', '#10B981'] : ['#64748B', '#475569']}
              style={styles.allowGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.allowBtnText}>
                    {isValid ? 'ALLOW ENTRY & CHECK IN' : 'OVERRIDE & CHECK IN'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.denyBtn, { borderColor: '#EF4444' }]}
            onPress={handleDenyEntry}
          >
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            <Text style={styles.denyBtnText}>DENY / TURN AWAY</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  headerTitleCol: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 12 },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  watchlistAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  watchlistTextCol: { flex: 1 },
  watchlistTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  watchlistDesc: { color: '#FFFFFF', fontSize: 12, marginTop: 2, lineHeight: 16 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  statusTextCol: { flex: 1 },
  statusMainText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  statusSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  photoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visitorPhoto: { width: '100%', height: '100%' },
  profileDetails: { flex: 1, marginLeft: 14 },
  visitorName: { fontSize: 17, fontWeight: '800' },
  visitorMobile: { fontSize: 13, marginTop: 2 },
  visitorRel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  idRef: { fontSize: 11, marginTop: 2 },
  hostBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 13 },
  bold: { fontWeight: '700' },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  scheduleCol: { flex: 1 },
  scheduleLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scheduleVal: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  entryFormCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  formTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  inputLabel: { fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4, letterSpacing: 0.5 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  actionsContainer: { gap: 12 },
  allowBtn: { borderRadius: 14, overflow: 'hidden' },
  allowBtnDisabled: { opacity: 0.7 },
  allowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  allowBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  denyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  denyBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  errorSub: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
