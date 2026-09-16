import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import AppTextInput from '@/src/components/AppTextInput';
import { styles as themeStyles } from '@/src/theme/styles';
import ScreenLayout from '@/src/components/ScreenLayout';
import StudentSubpageHeader from '@/src/components/StudentSubpageHeader';
import * as Haptics from '@/src/utils/haptics';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { clayCard, clayInset } from '@/src/theme/clayStyles';
import { schoolColorWithAlpha } from '@/src/constants/schoolConfig';
import {
  visitorService,
  type AuthorizedGuardian,
  type PickupAuthorization,
} from '@/src/services/visitorService';

const ACCENT = '#059669';
const RELATIONSHIPS = ['Parent', 'Father', 'Mother', 'Grandparent', 'Uncle', 'Aunt', 'Family Driver', 'Other'];

function formatWindow(start?: string, end?: string) {
  return [start, end].filter(Boolean).join(' – ');
}

function formatPickupDate(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function StudentPickupScreen() {
  const router = useRouter();
  const { portalContexts } = useAuth();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'request' | 'active'>('request');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [guardians, setGuardians] = useState<AuthorizedGuardian[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);
  const [activePickups, setActivePickups] = useState<PickupAuthorization[]>([]);

  const studentId = portalContexts?.activeContext?.student_id || '';
  const [pickupName, setPickupName] = useState('');
  const [pickupRelationship, setPickupRelationship] = useState('Parent');
  const [pickupMobile, setPickupMobile] = useState('');
  const [pickupDate, setPickupDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:30');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [newlyCreatedPass, setNewlyCreatedPass] = useState<{
    authorization: PickupAuthorization;
    otp?: string;
    qrToken?: string;
  } | null>(null);

  const styles = useMemo(() => createStyles(isDark, theme.colors), [isDark, theme.colors]);
  const inset = (key: string) => clayInset(isDark, focusedField === key);

  const loadData = useCallback(async () => {
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
  }, [studentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectGuardian = (g: AuthorizedGuardian) => {
    Haptics.selectionAsync();
    setSelectedGuardianId(g.id);
    setPickupName(g.name);
    setPickupRelationship(g.relationship || 'Parent');
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
      Alert.alert('Missing name', 'Please enter the name of the person picking up the student.');
      return;
    }
    if (!pickupMobile.trim()) {
      Alert.alert('Missing mobile', 'Please enter the contact mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await visitorService.createPickup({
        studentId,
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
      setActivePickups((prev) => [res.authorization, ...prev.filter((p) => p.id !== res.authorization.id)]);
      setActiveTab('active');
    } catch (err: any) {
      Alert.alert('Pickup request error', err?.message || 'Failed to authorize student pickup.');
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

  const otherPickups = newlyCreatedPass
    ? activePickups.filter((p) => p.id !== newlyCreatedPass.authorization.id)
    : activePickups;

  const webInput = (type: string) => (Platform.OS === 'web' ? ({ type } as any) : {});

  return (
    <ScreenLayout>
      <View style={styles.root}>
        <StudentSubpageHeader
          title="Pickup Pass"
          subtitle="Secure gate clearance for child handover"
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.headerAction}
              onPress={() => router.push('/Screen/authorizedGuardians' as any)}
              accessibilityRole="button"
              accessibilityLabel="Manage authorized guardians"
            >
              <Ionicons name="people-outline" size={18} color={ACCENT} />
            </TouchableOpacity>
          }
        />

        <View style={styles.tabTrack}>
          {([
            { key: 'request' as const, label: 'Authorize', icon: 'shield-checkmark-outline' as const },
            { key: 'active' as const, label: 'Active passes', icon: 'qr-code-outline' as const, count: activePickups.length },
          ]).map((tab) => {
            const on = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, on && styles.tabItemOn]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={tab.icon} size={14} color={on ? ACCENT : theme.colors.textMuted} />
                <Text style={[styles.tabText, { color: on ? ACCENT : theme.colors.textMuted }]}>
                  {tab.label}
                </Text>
                {tab.count ? (
                  <View style={[styles.tabCount, on && styles.tabCountOn]}>
                    <Text style={[styles.tabCountText, on && styles.tabCountTextOn]}>{tab.count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'request' ? (
              <View>
                {guardians.length > 0 ? (
                  <Animated.View entering={FadeInDown.duration(240)} style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionTitle}>Who is picking up?</Text>
                      <TouchableOpacity onPress={() => router.push('/Screen/authorizedGuardians' as any)}>
                        <Text style={styles.manageLink}>Manage</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.guardiansRow}>
                      {guardians.map((g) => {
                        const isSelected = selectedGuardianId === g.id;
                        return (
                          <TouchableOpacity
                            key={g.id}
                            style={[styles.guardianCard, isSelected && styles.guardianCardOn]}
                            onPress={() => (isSelected ? clearSelectedGuardian() : selectGuardian(g))}
                            activeOpacity={0.86}
                          >
                            <View style={[styles.guardianAvatar, isSelected && styles.guardianAvatarOn]}>
                              {g.photo_url ? (
                                <Image source={{ uri: g.photo_url }} style={styles.avatarImg} />
                              ) : (
                                <Text style={styles.avatarInitial}>{g.name.charAt(0).toUpperCase()}</Text>
                              )}
                            </View>
                            <Text style={styles.guardianName} numberOfLines={1}>{g.name}</Text>
                            <Text style={styles.guardianRel} numberOfLines={1}>{g.relationship}</Text>
                            {isSelected ? (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                ) : (
                  <TouchableOpacity
                    style={styles.promptCard}
                    onPress={() => router.push('/Screen/authorizedGuardians' as any)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.promptIcon}>
                      <Ionicons name="person-add-outline" size={18} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.promptTitle}>Save a guardian for faster pickups</Text>
                      <Text style={styles.promptCopy}>Add family or a driver once, then generate a pass in one tap.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                )}

                <View style={styles.formCard}>
                  <Text style={styles.cardTitle}>Pickup details</Text>
                  <Text style={styles.cardHint}>Gate security will verify this person before handover.</Text>

                  <Text style={styles.inputLabel}>Full name</Text>
                  <AppTextInput
                    style={[themeStyles.inputInChrome, styles.input, inset('name')]}
                    placeholder="e.g. Rajesh Kumar"
                    value={pickupName}
                    onChangeText={(t) => {
                      setPickupName(t);
                      if (selectedGuardianId) setSelectedGuardianId(null);
                    }}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <Text style={styles.inputLabel}>Relationship</Text>
                  <View style={styles.chipWrap}>
                    {RELATIONSHIPS.map((rel) => {
                      const on = pickupRelationship === rel;
                      return (
                        <TouchableOpacity
                          key={rel}
                          style={[styles.relChip, on && styles.relChipOn]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPickupRelationship(rel);
                          }}
                        >
                          <Text style={[styles.relChipText, on && styles.relChipTextOn]}>{rel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>Mobile number</Text>
                  <AppTextInput
                    style={[themeStyles.inputInChrome, styles.input, inset('mobile')]}
                    placeholder="e.g. 9876543210"
                    keyboardType="phone-pad"
                    value={pickupMobile}
                    onChangeText={setPickupMobile}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <View style={styles.rowInputs}>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Pickup date</Text>
                      <AppTextInput
                        style={[themeStyles.inputInChrome, styles.input, inset('date')]}
                        value={pickupDate}
                        onChangeText={setPickupDate}
                        onFocus={() => setFocusedField('date')}
                        onBlur={() => setFocusedField(null)}
                        {...webInput('date')}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.inputLabel}>Time window</Text>
                      <View style={styles.timeRow}>
                        <AppTextInput
                          style={[themeStyles.inputInChrome, styles.smallInput, inset('start')]}
                          value={startTime}
                          onChangeText={setStartTime}
                          onFocus={() => setFocusedField('start')}
                          onBlur={() => setFocusedField(null)}
                          {...webInput('time')}
                        />
                        <Text style={styles.timeDash}>–</Text>
                        <AppTextInput
                          style={[themeStyles.inputInChrome, styles.smallInput, inset('end')]}
                          value={endTime}
                          onChangeText={setEndTime}
                          onFocus={() => setFocusedField('end')}
                          onBlur={() => setFocusedField(null)}
                          {...webInput('time')}
                        />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Vehicle number <Text style={styles.optional}>(optional)</Text></Text>
                  <AppTextInput
                    style={[themeStyles.inputInChrome, styles.input, inset('vehicle')]}
                    placeholder="e.g. KA-01-AB-1234"
                    autoCapitalize="characters"
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    onFocus={() => setFocusedField('vehicle')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <Text style={styles.inputLabel}>Reason / notes <Text style={styles.optional}>(optional)</Text></Text>
                  <AppTextInput
                    style={[themeStyles.inputInChrome, styles.textArea, inset('notes')]}
                    placeholder="e.g. Early doctor appointment"
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    onFocus={() => setFocusedField('notes')}
                    onBlur={() => setFocusedField(null)}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleCreatePickup}
                    disabled={submitting}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#047857', '#10B981']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gradientBtn}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.btnText}>Generate secure pass</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.securityBanner}>
                  <View style={styles.securityIcon}>
                    <Ionicons name="shield-checkmark" size={18} color={ACCENT} />
                  </View>
                  <View style={styles.bannerTextCol}>
                    <Text style={styles.bannerTitle}>Verified handover only</Text>
                    <Text style={styles.bannerDesc}>
                      Gate security scans the QR pass and confirms the OTP before any student is released outside regular bus routes.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View>
                {newlyCreatedPass ? (
                  <Animated.View entering={FadeInDown.duration(280)} style={styles.highlightCard}>
                    <View style={styles.highlightBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
                      <Text style={styles.highlightBadgeText}>Pass ready</Text>
                    </View>

                    <View style={styles.qrCenterBox}>
                      <QRCode
                        value={newlyCreatedPass.qrToken || newlyCreatedPass.authorization.pass_code}
                        size={152}
                        color="#0F172A"
                        backgroundColor="#FFFFFF"
                      />
                      <Text style={styles.passCodeLabel}>
                        Pass code{' '}
                        <Text style={styles.bold}>{newlyCreatedPass.authorization.pass_code}</Text>
                      </Text>
                    </View>

                    {newlyCreatedPass.otp ? (
                      <View style={styles.otpBox}>
                        <Text style={styles.otpHeader}>One-time release OTP</Text>
                        <Text style={styles.otpDigits}>{newlyCreatedPass.otp}</Text>
                        <Text style={styles.otpSub}>Share this 6-digit code with the person at the gate</Text>
                      </View>
                    ) : null}

                    <View style={styles.metaBox}>
                      <Text style={styles.metaStrong}>{newlyCreatedPass.authorization.pickup_name}</Text>
                      <Text style={styles.metaMuted}>
                        {newlyCreatedPass.authorization.pickup_relationship}
                        {' · '}
                        {formatPickupDate(newlyCreatedPass.authorization.pickup_date)}
                        {' · '}
                        {formatWindow(newlyCreatedPass.authorization.valid_start_time, newlyCreatedPass.authorization.valid_end_time)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.sharePickupBtn}
                      onPress={() => onSharePickupPass(newlyCreatedPass.authorization, newlyCreatedPass.otp)}
                    >
                      <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.sharePickupBtnText}>Share pass with guardian</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}

                {loading && activePickups.length === 0 && !newlyCreatedPass ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator color={ACCENT} />
                    <Text style={styles.emptySub}>Loading passes…</Text>
                  </View>
                ) : null}

                {otherPickups.map((pass, index) => (
                  <Animated.View
                    key={pass.id}
                    entering={FadeInDown.delay(Math.min(index, 5) * 40).duration(240)}
                    style={styles.passCard}
                  >
                    <View style={styles.passRow}>
                      <View style={styles.passAvatar}>
                        <Text style={styles.avatarInitial}>{pass.pickup_name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.passName}>{pass.pickup_name}</Text>
                        <Text style={styles.passMeta}>
                          {pass.pickup_relationship} · {formatPickupDate(pass.pickup_date)} · {formatWindow(pass.valid_start_time, pass.valid_end_time)}
                        </Text>
                        <Text style={styles.passCode}>#{pass.pass_code}</Text>
                      </View>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{pass.status || 'ACTIVE'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.shareGhost}
                      onPress={() => onSharePickupPass(pass)}
                    >
                      <Ionicons name="share-outline" size={14} color={ACCENT} />
                      <Text style={styles.shareGhostText}>Share pass</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}

                {activePickups.length === 0 && !newlyCreatedPass && !loading ? (
                  <Animated.View entering={FadeIn.duration(280)} style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Ionicons name="car-outline" size={30} color={ACCENT} />
                    </View>
                    <Text style={styles.emptyTitle}>No active pickup passes</Text>
                    <Text style={styles.emptySub}>
                      Authorize a parent, relative, or driver to pick up your child at the gate.
                    </Text>
                    <TouchableOpacity style={styles.createFirstBtn} onPress={() => setActiveTab('request')}>
                      <Text style={styles.createFirstBtnText}>Create a pass</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScreenLayout>
  );
}

function createStyles(
  isDark: boolean,
  colors: { background: string; textStrong: string; textMuted: string; border: string },
) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    headerAction: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16,185,129,0.28)' : '#A7F3D0',
    },
    tabTrack: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 4,
      gap: 4,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.045)',
    },
    tabItem: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tabItemOn: { backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#FFFFFF' },
    tabText: { fontSize: 13, fontWeight: '800' },
    tabCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
    },
    tabCountOn: { backgroundColor: ACCENT },
    tabCountText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
    tabCountTextOn: { color: '#FFFFFF' },
    scrollContent: { padding: 16, paddingBottom: 48 },
    sectionBlock: { marginBottom: 16 },
    sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.textStrong, letterSpacing: -0.2 },
    manageLink: { color: ACCENT, fontSize: 13, fontWeight: '800' },
    guardiansRow: { gap: 10, paddingRight: 8 },
    guardianCard: {
      ...clayCard(isDark, 'sm'),
      alignItems: 'center',
      padding: 12,
      borderRadius: 18,
      width: 108,
      position: 'relative',
    },
    guardianCardOn: {
      borderColor: ACCENT,
      backgroundColor: isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5',
    },
    guardianAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
      overflow: 'hidden',
    },
    guardianAvatarOn: { backgroundColor: ACCENT },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitial: { fontSize: 16, fontWeight: '800', color: ACCENT },
    guardianName: { fontSize: 12, fontWeight: '800', textAlign: 'center', color: colors.textStrong },
    guardianRel: { fontSize: 11, textAlign: 'center', marginTop: 2, color: colors.textMuted, fontWeight: '600' },
    selectedBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: ACCENT,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    promptCard: {
      ...clayCard(isDark, 'sm'),
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      marginBottom: 16,
    },
    promptIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
    },
    promptTitle: { fontSize: 14, fontWeight: '800', color: colors.textStrong },
    promptCopy: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
    formCard: {
      ...clayCard(isDark, 'sm'),
      borderRadius: 22,
      padding: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textStrong, letterSpacing: -0.2 },
    cardHint: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 8, lineHeight: 18 },
    inputLabel: {
      fontSize: 12,
      fontWeight: '800',
      marginTop: 12,
      marginBottom: 6,
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
    optional: { fontWeight: '600', color: colors.textMuted },
    input: {
      height: 46,
      width: '100%',
      maxWidth: '100%',
      borderRadius: 14,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.textStrong,
    },
    textArea: {
      minHeight: 78,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingTop: 12,
      fontSize: 15,
      color: colors.textStrong,
      textAlignVertical: 'top',
    },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    relChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    },
    relChipOn: {
      backgroundColor: ACCENT,
      borderColor: ACCENT,
    },
    relChipText: { fontSize: 12, fontWeight: '700', color: colors.textStrong },
    relChipTextOn: { color: '#FFFFFF' },
    rowInputs: { flexDirection: 'row', gap: 10 },
    flex1: { flex: 1 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    smallInput: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      paddingHorizontal: 8,
      fontSize: 13,
      textAlign: 'center',
      color: colors.textStrong,
    },
    timeDash: { color: colors.textMuted, fontWeight: '700' },
    submitBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
    gradientBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      gap: 8,
    },
    btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    securityBanner: {
      ...clayCard(isDark, 'sm'),
      flexDirection: 'row',
      gap: 12,
      borderRadius: 18,
      padding: 14,
      marginTop: 14,
    },
    securityIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
    },
    bannerTextCol: { flex: 1 },
    bannerTitle: { fontSize: 13, fontWeight: '800', color: colors.textStrong },
    bannerDesc: { fontSize: 12, lineHeight: 18, marginTop: 4, color: colors.textMuted },
    highlightCard: {
      ...clayCard(isDark, 'md'),
      borderRadius: 24,
      padding: 18,
      alignItems: 'center',
      borderColor: ACCENT,
      marginBottom: 14,
    },
    highlightBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    highlightBadgeText: { color: ACCENT, fontSize: 12, fontWeight: '800' },
    qrCenterBox: {
      backgroundColor: '#FFFFFF',
      padding: 16,
      borderRadius: 20,
      alignItems: 'center',
    },
    passCodeLabel: { fontSize: 13, color: '#0F172A', marginTop: 10, fontWeight: '600' },
    bold: { fontWeight: '800' },
    otpBox: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      width: '100%',
      marginTop: 16,
    },
    otpHeader: { fontSize: 11, fontWeight: '800', color: '#047857', letterSpacing: 0.8, textTransform: 'uppercase' },
    otpDigits: { fontSize: 32, fontWeight: '900', color: ACCENT, letterSpacing: 6, marginVertical: 4 },
    otpSub: { fontSize: 12, color: '#047857', textAlign: 'center' },
    metaBox: { width: '100%', marginTop: 16, alignItems: 'center' },
    metaStrong: { fontSize: 16, fontWeight: '800', color: colors.textStrong },
    metaMuted: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    sharePickupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: ACCENT,
      width: '100%',
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 16,
    },
    sharePickupBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    passCard: {
      ...clayCard(isDark, 'sm'),
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
    },
    passRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    passAvatar: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    passName: { fontSize: 15, fontWeight: '800', color: colors.textStrong },
    passMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    passCode: { fontSize: 12, color: ACCENT, fontWeight: '800', marginTop: 4 },
    statusPill: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusPillText: { color: ACCENT, fontSize: 10, fontWeight: '800' },
    shareGhost: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: schoolColorWithAlpha('#94A3B8', isDark ? 0.24 : 0.28),
    },
    shareGhostText: { color: ACCENT, fontSize: 13, fontWeight: '800' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 48, paddingHorizontal: 28, gap: 8 },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : '#ECFDF5',
      marginBottom: 6,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textStrong, textAlign: 'center', letterSpacing: -0.3 },
    emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, color: colors.textMuted, maxWidth: 280 },
    createFirstBtn: {
      marginTop: 10,
      backgroundColor: ACCENT,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
    },
    createFirstBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  });
}
