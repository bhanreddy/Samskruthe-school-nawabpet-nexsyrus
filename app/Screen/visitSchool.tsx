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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { visitorService, type VisitorRequest } from '@/src/services/visitorService';

const DEPARTMENTS = [
  { id: 'Teacher', label: 'Class Teacher', icon: 'person-outline' },
  { id: 'Principal', label: 'Principal', icon: 'school-outline' },
  { id: 'Accounts', label: 'Accounts / Fees', icon: 'wallet-outline' },
  { id: 'Management', label: 'Management', icon: 'ribbon-outline' },
  { id: 'Office', label: 'Administrative Office', icon: 'business-outline' },
  { id: 'Transport', label: 'Transport Dept', icon: 'bus-outline' },
  { id: 'Hostel', label: 'Hostel Warden', icon: 'bed-outline' },
];

export default function VisitSchoolScreen() {
  const router = useRouter();
  const { user, portalContexts } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'book' | 'my_visits'>('book');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [myVisits, setMyVisits] = useState<VisitorRequest[]>([]);

  // Form state (autofilled from authenticated parent)
  const [visitorName, setVisitorName] = useState(user?.display_name || user?.name || '');
  const [mobileNumber, setMobileNumber] = useState(user?.email?.split('@')[0] || '');
  const [relationship, setRelationship] = useState('Parent');
  const [department, setDepartment] = useState('Teacher');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [purpose, setPurpose] = useState('');
  const [visitorCount, setVisitorCount] = useState('1');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const loadMyVisits = async () => {
    setFetching(true);
    try {
      const requests = await visitorService.getVisitorRequests();
      setMyVisits(requests);
    } catch (err: any) {
      console.error('Failed to load visits:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadMyVisits();
  }, []);

  const handleSubmit = async () => {
    if (!visitorName.trim() || !mobileNumber.trim() || !purpose.trim()) {
      Alert.alert('Required Fields', 'Please fill in visitor name, mobile number, and visit purpose.');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await visitorService.createVisitorRequest({
        visitorFullName: visitorName.trim(),
        visitorMobile: mobileNumber.trim(),
        relationship,
        destinationDepartment: department,
        visitDate,
        startTime,
        endTime,
        purpose: purpose.trim(),
        visitorCount: Number(visitorCount) || 1,
        vehicleNumber: vehicleNumber.trim() || undefined,
        studentId: portalContexts?.activeContext?.student_id || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (res.qrToken && res.request?.id) {
        Alert.alert(
          'Pass Issued!',
          'Your campus visit request has been approved and a secure QR pass is ready.',
          [
            {
              text: 'View Pass',
              onPress: () => router.push({ pathname: '/Screen/visitorPass', params: { requestId: res.request.id, token: res.qrToken } } as any),
            },
            { text: 'OK', onPress: () => setActiveTab('my_visits') },
          ]
        );
      } else {
        Alert.alert(
          'Request Submitted',
          'Your campus visit request has been sent for approval. You will be notified once confirmed.',
          [{ text: 'OK', onPress: () => setActiveTab('my_visits') }]
        );
      }

      setPurpose('');
      loadMyVisits();
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.message || 'Could not submit visit request');
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark ? '#0B0F19' : '#F8FAFC';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const subColor = isDark ? '#94A3B8' : '#64748B';
  const borderColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Visit School</Text>
          <Text style={[styles.headerSub, { color: subColor }]}>Campus Access & Appointments</Text>
        </View>
        <TouchableOpacity onPress={loadMyVisits} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: cardBg, borderColor }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'book' && styles.tabItemActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('book');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'book' ? '#10B981' : subColor }]}>Book Visit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'my_visits' && styles.tabItemActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab('my_visits');
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === 'my_visits' ? '#10B981' : subColor }]}>
            My Passes ({myVisits.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'book' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Destination Selector */}
          <Text style={[styles.sectionLabel, { color: textColor }]}>Who do you want to meet?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptRow}>
            {DEPARTMENTS.map((dept) => {
              const isSelected = department === dept.id;
              return (
                <TouchableOpacity
                  key={dept.id}
                  style={[
                    styles.deptChip,
                    { backgroundColor: isSelected ? '#10B981' : cardBg, borderColor: isSelected ? '#10B981' : borderColor },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDepartment(dept.id);
                  }}
                >
                  <Ionicons name={dept.icon as any} size={18} color={isSelected ? '#FFFFFF' : textColor} />
                  <Text style={[styles.deptChipText, { color: isSelected ? '#FFFFFF' : textColor }]}>{dept.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.inputLabel, { color: subColor }]}>Visitor Full Name *</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={visitorName}
              onChangeText={setVisitorName}
              placeholder="Full name"
              placeholderTextColor={subColor}
            />

            <Text style={[styles.inputLabel, { color: subColor }]}>Mobile Number *</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              placeholder="10-digit mobile number"
              placeholderTextColor={subColor}
            />

            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <Text style={[styles.inputLabel, { color: subColor }]}>Relationship</Text>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="Father / Mother / etc."
                  placeholderTextColor={subColor}
                />
              </View>
              <View style={styles.inputSpacer} />
              <View style={styles.flex1}>
                <Text style={[styles.inputLabel, { color: subColor }]}>Total Visitors</Text>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  value={visitorCount}
                  onChangeText={setVisitorCount}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={subColor}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.flex1}>
                <Text style={[styles.inputLabel, { color: subColor }]}>Visit Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  value={visitDate}
                  onChangeText={setVisitDate}
                  placeholder="2026-09-15"
                  placeholderTextColor={subColor}
                />
              </View>
              <View style={styles.inputSpacer} />
              <View style={styles.flex1}>
                <Text style={[styles.inputLabel, { color: subColor }]}>Time (Start - End)</Text>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor }]}
                  value={`${startTime} - ${endTime}`}
                  onChangeText={(t) => {
                    const parts = t.split('-');
                    if (parts[0]) setStartTime(parts[0].trim());
                    if (parts[1]) setEndTime(parts[1].trim());
                  }}
                  placeholder="10:00 - 11:00"
                  placeholderTextColor={subColor}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: subColor }]}>Vehicle Number (Optional)</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
              placeholder="e.g. AP 28 AB 1234"
              placeholderTextColor={subColor}
            />

            <Text style={[styles.inputLabel, { color: subColor }]}>Purpose of Visit *</Text>
            <TextInput
              style={[styles.textArea, { color: textColor, borderColor }]}
              value={purpose}
              onChangeText={setPurpose}
              multiline
              numberOfLines={3}
              placeholder="Briefly state the reason for meeting..."
              placeholderTextColor={subColor}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.submitGradient}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitText}>Request Campus Access Pass</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {fetching ? (
            <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
          ) : myVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={50} color={subColor} />
              <Text style={[styles.emptyText, { color: textColor }]}>No visit passes found</Text>
              <Text style={[styles.emptySub, { color: subColor }]}>Book a visit above to generate your QR pass</Text>
            </View>
          ) : (
            myVisits.map((v) => {
              const isApproved = v.approval_status === 'APPROVED' || v.approval_status === 'CHECKED_IN';
              const isPending = v.approval_status === 'PENDING';
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.passCard, { backgroundColor: cardBg, borderColor }]}
                  onPress={() => {
                    if (isApproved) {
                      router.push({ pathname: '/Screen/visitorPass', params: { requestId: v.id } } as any);
                    }
                  }}
                >
                  <View style={styles.passHeader}>
                    <View>
                      <Text style={[styles.passTitle, { color: textColor }]}>{v.destination_department || 'School Meeting'}</Text>
                      <Text style={[styles.passDate, { color: subColor }]}>
                        {v.visit_date} • {v.start_time} - {v.end_time}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isApproved
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isPending
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: isApproved ? '#10B981' : isPending ? '#F59E0B' : '#EF4444',
                          },
                        ]}
                      >
                        {v.approval_status}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.passPurpose, { color: textColor }]} numberOfLines={2}>
                    {v.purpose}
                  </Text>

                  {v.pass_code ? (
                    <View style={styles.passFooter}>
                      <View style={styles.passCodePill}>
                        <Ionicons name="qr-code" size={14} color="#10B981" />
                        <Text style={styles.passCodeText}>{v.pass_code}</Text>
                      </View>
                      <Text style={styles.tapToView}>Tap to view QR pass →</Text>
                    </View>
                  ) : null}
                  {(isPending || v.approval_status === 'APPROVED') ? (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await visitorService.cancelVisitorRequest(v.id, 'Cancelled by parent');
                          loadMyVisits();
                        } catch (e: any) {
                          Alert.alert('Cancel failed', e?.message || 'Could not cancel visit');
                        }
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: '700', marginTop: 8 }}>Cancel visit</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
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
  backButton: { padding: 8 },
  headerTitleBlock: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12 },
  refreshButton: { padding: 8 },
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
  tabText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  deptRow: { marginBottom: 16 },
  deptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  deptChipText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputLabel: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rowInputs: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  inputSpacer: { width: 12 },
  submitButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  passCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  passTitle: { fontSize: 16, fontWeight: '700' },
  passDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  passPurpose: { fontSize: 13, marginTop: 8 },
  passFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  passCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passCodeText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  tapToView: { color: '#10B981', fontSize: 12, fontWeight: '600' },
});
