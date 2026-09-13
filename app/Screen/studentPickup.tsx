import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from '@/src/utils/haptics';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import {
  visitorService,
  type AuthorizedGuardian,
  type PickupAuthorization,
} from '@/src/services/visitorService';

export default function StudentPickupScreen() {
  const router = useRouter();
  const { user, portalContexts } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'request' | 'active'>('request');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Guardians & Student Pickups
  const [guardians, setGuardians] = useState<AuthorizedGuardian[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [activePickups, setActivePickups] = useState<PickupAuthorization[]>([]);

  // Form fields
  const studentId = portalContexts?.activeContext?.student_id || '';
  const [pickupName, setPickupName] = useState('');
  const [pickupRelationship, setPickupRelationship] = useState('Parent');
  const [pickupMobile, setPickupMobile] = useState('');
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:30');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Generated pass state after submission
  const [newlyCreatedPass, setNewlyCreatedPass] = useState<{
    authorization: PickupAuthorization;
    otp?: string;
    qrToken?: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (studentId) {
        const [gList, pickupList] = await Promise.all([
          visitorService.getGuardians(studentId),
          visitorService.getPickups().catch(() => []),
        ]);
        setGuardians(gList);
        setActivePickups(pickupList);
      }
    } catch (e) {
      console.warn('Failed to load guardians:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const selectGuardian = (g: AuthorizedGuardian) => {
    Haptics.selectionAsync();
    setSelectedGuardianId(g.id);
    setPickupName(g.name);
    setPickupRelationship(g.relationship);
    setPickupMobile(g.mobile);
  };

  const clearSelectedGuardian = () => {
    setSelectedGuardianId(null);
    setPickupName('');
    setPickupRelationship('Other');
    setPickupMobile('');
  };

  const handleCreatePickup = async () => {
    if (!pickupName.trim()) {
      Alert.alert('Missing Field', 'Please enter the name of the person picking up the student.');
      return;
    }
    if (!pickupMobile.trim()) {
      Alert.alert('Missing Field', 'Please enter the contact mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await visitorService.createPickup({
        studentId: studentId,
        guardianId: selectedGuardianId || undefined,
        pickupName: pickupName.trim(),
        pickupRelationship: pickupRelationship.trim(),
        pickupMobile: pickupMobile.trim(),
        pickupDate,
        validStartTime: startTime,
        validEndTime: endTime,
        vehicleNumber: vehicleNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewlyCreatedPass({
        authorization: res.authorization,
        otp: res.otp,
        qrToken: res.qrToken,
      });
      setActivePickups((prev) => [res.authorization, ...prev]);
      setActiveTab('active');
    } catch (err: any) {
      Alert.alert('Pickup Request Error', err?.message || 'Failed to authorize student pickup.');
    } finally {
      setSubmitting(false);
    }
  };

  const onSharePickupPass = async (pass: PickupAuthorization, otp?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const msg = `School Student Pickup Pass\nStudent: ${pass.student_name || 'Enrolled Student'}\nAuthorized: ${pass.pickup_name} (${pass.pickup_relationship})\nDate: ${pass.pickup_date} (${pass.valid_start_time} - ${pass.valid_end_time})\nPass Code: ${pass.pass_code}${otp ? `\nSecurity Verification OTP: ${otp}` : ''}\nPlease show this pass to gate security for student handover.`;
      await Share.share({
        message: msg,
        title: `Student Pickup Pass - ${pass.pass_code}`,
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

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Student Pickup Pass</Text>
          <Text style={[styles.headerSub, { color: subColor }]}>Gate Clearance & Child Handover</Text>
        </View>
        <TouchableOpacity
          style={styles.guardiansBtn}
          onPress={() => router.push('/Screen/authorizedGuardians' as any)}
        >
          <Ionicons name="people-outline" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
          onPress={() => setActiveTab('request')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'request' ? '#10B981' : subColor },
            ]}
          >
            Authorize Pickup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'active' && styles.tabItemActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'active' ? '#10B981' : subColor },
            ]}
          >
            Active Passes {activePickups.length > 0 ? `(${activePickups.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'request' ? (
          <View>
            {/* Quick Pick: Authorized Guardians */}
            {guardians.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Choose Registered Guardian
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/Screen/authorizedGuardians' as any)}>
                    <Text style={styles.manageLink}>Manage (+)</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guardiansScroll}>
                  {guardians.map((g) => {
                    const isSelected = selectedGuardianId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.guardianCard,
                          {
                            backgroundColor: isSelected ? 'rgba(16,185,129,0.12)' : cardBg,
                            borderColor: isSelected ? '#10B981' : borderColor,
                          },
                        ]}
                        onPress={() => (isSelected ? clearSelectedGuardian() : selectGuardian(g))}
                      >
                        <View style={styles.guardianAvatar}>
                          {g.photo_url ? (
                            <Image source={{ uri: g.photo_url }} style={styles.avatarImg} />
                          ) : (
                            <Ionicons name="person" size={24} color="#10B981" />
                          )}
                        </View>
                        <Text style={[styles.guardianName, { color: textColor }]} numberOfLines={1}>
                          {g.name}
                        </Text>
                        <Text style={[styles.guardianRel, { color: subColor }]}>{g.relationship}</Text>
                        {isSelected ? (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Pickup Person Form */}
            <View style={[styles.formCard, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Pickup Details</Text>

              <Text style={[styles.inputLabel, { color: subColor }]}>PERSON'S FULL NAME *</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                placeholder="e.g. Rajesh Kumar"
                placeholderTextColor={subColor}
                value={pickupName}
                onChangeText={(t) => {
                  setPickupName(t);
                  if (selectedGuardianId) setSelectedGuardianId(null);
                }}
              />

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={[styles.inputLabel, { color: subColor }]}>RELATIONSHIP *</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor }]}
                    placeholder="e.g. Father, Driver"
                    placeholderTextColor={subColor}
                    value={pickupRelationship}
                    onChangeText={setPickupRelationship}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={styles.flex1}>
                  <Text style={[styles.inputLabel, { color: subColor }]}>MOBILE NUMBER *</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor }]}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={subColor}
                    keyboardType="phone-pad"
                    value={pickupMobile}
                    onChangeText={setPickupMobile}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={styles.flex1}>
                  <Text style={[styles.inputLabel, { color: subColor }]}>PICKUP DATE</Text>
                  <TextInput
                    style={[styles.input, { color: textColor, borderColor }]}
                    value={pickupDate}
                    onChangeText={setPickupDate}
                  />
                </View>
                <View style={styles.spacer} />
                <View style={styles.flex1}>
                  <Text style={[styles.inputLabel, { color: subColor }]}>WINDOW (START - END)</Text>
                  <View style={styles.timeRow}>
                    <TextInput
                      style={[styles.smallInput, { color: textColor, borderColor }]}
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                    <Text style={{ color: subColor }}>-</Text>
                    <TextInput
                      style={[styles.smallInput, { color: textColor, borderColor }]}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: subColor }]}>VEHICLE NUMBER (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                placeholder="e.g. KA-01-AB-1234"
                placeholderTextColor={subColor}
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />

              <Text style={[styles.inputLabel, { color: subColor }]}>REASON / NOTES</Text>
              <TextInput
                style={[styles.textArea, { color: textColor, borderColor }]}
                placeholder="e.g. Early doctor appointment pickup"
                placeholderTextColor={subColor}
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreatePickup}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#059669', '#10B981']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.btnText}>Generate Secure Pickup Pass</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Safety Banner */}
            <View style={[styles.securityBanner, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="shield-checkmark" size={22} color="#10B981" />
              <View style={styles.bannerTextCol}>
                <Text style={[styles.bannerTitle, { color: textColor }]}>Zero-Unauthorized Release Policy</Text>
                <Text style={[styles.bannerDesc, { color: subColor }]}>
                  The school gate security team strictly requires QR pass scanning and OTP authentication before any student is dismissed outside regular bus routes.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* Active Pickups Tab */
          <View>
            {newlyCreatedPass ? (
              <View style={[styles.highlightCard, { backgroundColor: cardBg, borderColor: '#10B981' }]}>
                <View style={styles.highlightBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.highlightBadgeText}>NEW PICKUP AUTHORIZATION READY</Text>
                </View>

                <View style={styles.qrCenterBox}>
                  <QRCode
                    value={newlyCreatedPass.qrToken || newlyCreatedPass.authorization.pass_code}
                    size={160}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                  <Text style={styles.passCodeLabel}>
                    Pass Code: <Text style={styles.bold}>{newlyCreatedPass.authorization.pass_code}</Text>
                  </Text>
                </View>

                {newlyCreatedPass.otp ? (
                  <View style={styles.otpBox}>
                    <Text style={styles.otpHeader}>ONE-TIME RELEASE OTP</Text>
                    <Text style={styles.otpDigits}>{newlyCreatedPass.otp}</Text>
                    <Text style={styles.otpSub}>Provide this 6-digit code to the gate officer</Text>
                  </View>
                ) : null}

                <View style={styles.metaBox}>
                  <Text style={[styles.metaItem, { color: textColor }]}>
                    Authorized Person: <Text style={styles.bold}>{newlyCreatedPass.authorization.pickup_name}</Text> ({newlyCreatedPass.authorization.pickup_relationship})
                  </Text>
                  <Text style={[styles.metaItem, { color: subColor }]}>
                    Date & Window: {newlyCreatedPass.authorization.pickup_date} ({newlyCreatedPass.authorization.valid_start_time} - {newlyCreatedPass.authorization.valid_end_time})
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.sharePickupBtn}
                  onPress={() => onSharePickupPass(newlyCreatedPass.authorization, newlyCreatedPass.otp)}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.sharePickupBtnText}>Share Pass & OTP with Guardian</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {activePickups.length === 0 && !newlyCreatedPass ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={48} color={subColor} />
                <Text style={[styles.emptyTitle, { color: textColor }]}>No Active Pickup Passes</Text>
                <Text style={[styles.emptySub, { color: subColor }]}>
                  Authorize a parent, relative, or driver to pick up your child securely.
                </Text>
                <TouchableOpacity
                  style={styles.createFirstBtn}
                  onPress={() => setActiveTab('request')}
                >
                  <Text style={styles.createFirstBtnText}>Create Pickup Pass</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 6 },
  headerTitleBlock: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  guardiansBtn: { padding: 8 },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#10B981' },
  tabText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionBlock: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  manageLink: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  guardiansScroll: { flexDirection: 'row' },
  guardianCard: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    width: 100,
    position: 'relative',
  },
  guardianAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  guardianName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  guardianRel: { fontSize: 10, textAlign: 'center', marginTop: 2 },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#10B981',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 70,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  spacer: { width: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  submitBtn: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  securityBanner: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  bannerTextCol: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700' },
  bannerDesc: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  highlightCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  highlightBadgeText: { color: '#10B981', fontSize: 12, fontWeight: '800' },
  qrCenterBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  passCodeLabel: { fontSize: 13, color: '#0F172A', marginTop: 10 },
  bold: { fontWeight: '700' },
  otpBox: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  otpHeader: { fontSize: 11, fontWeight: '800', color: '#059669', letterSpacing: 1 },
  otpDigits: { fontSize: 32, fontWeight: '900', color: '#10B981', letterSpacing: 6, marginVertical: 4 },
  otpSub: { fontSize: 11, color: '#059669' },
  metaBox: { width: '100%', marginTop: 16, gap: 4 },
  metaItem: { fontSize: 13 },
  sharePickupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  sharePickupBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  createFirstBtn: {
    marginTop: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createFirstBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
