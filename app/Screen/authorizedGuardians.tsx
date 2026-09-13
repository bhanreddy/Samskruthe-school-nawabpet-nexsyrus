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
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '@/src/utils/haptics';
import { useAuth } from '@/src/hooks/useAuth';
import { useTheme } from '@/src/hooks/useTheme';
import { visitorService, type AuthorizedGuardian } from '@/src/services/visitorService';

const RELATIONSHIPS = ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Family Driver', 'Other Guardian'];

export default function AuthorizedGuardiansScreen() {
  const router = useRouter();
  const { user, portalContexts } = useAuth();
  const { isDark } = useTheme();

  const studentId = portalContexts?.activeContext?.student_id || '';
  const [guardians, setGuardians] = useState<AuthorizedGuardian[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Form
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Father');
  const [mobile, setMobile] = useState('');
  const [idReference, setIdReference] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const loadGuardians = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const list = await visitorService.getGuardians(studentId);
      setGuardians(list);
    } catch (e: any) {
      console.warn('Failed to load guardians:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuardians();
  }, [studentId]);

  const handlePickPhoto = async () => {
    Haptics.selectionAsync();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow gallery access to upload a guardian photo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const handleAddGuardian = async () => {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Missing Fields', 'Please enter guardian name and mobile number.');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await visitorService.addGuardian({
        studentId,
        name: name.trim(),
        relationship,
        mobile: mobile.trim(),
        idReferenceMasked: idReference.trim() || undefined,
        photoUrl: photoUri || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGuardians((prev) => [res.guardian, ...prev]);
      setModalVisible(false);
      setName('');
      setMobile('');
      setIdReference('');
      setPhotoUri(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save authorized guardian');
    } finally {
      setSubmitting(false);
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
          <Text style={[styles.headerTitle, { color: textColor }]}>Authorized Guardians</Text>
          <Text style={[styles.headerSub, { color: subColor }]}>Child Release Whitelist</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Policy Box */}
        <View style={[styles.policyBox, { backgroundColor: cardBg, borderColor }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
          <Text style={[styles.policyText, { color: subColor }]}>
            Registered guardians are verified by gatekeepers during student dismissals. Ensure clear facial photos are attached for instant identity confirmation.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#10B981" />
          </View>
        ) : guardians.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-circle-outline" size={64} color={subColor} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>No Authorized Guardians Added</Text>
            <Text style={[styles.emptySub, { color: subColor }]}>
              Pre-authorize family members or personal drivers to ensure fast and secure student pickups at the gate.
            </Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addFirstBtnText}>+ Add First Guardian</Text>
            </TouchableOpacity>
          </View>
        ) : (
          guardians.map((g) => (
            <View key={g.id} style={[styles.guardianCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.guardianRow}>
                <View style={styles.avatarWrap}>
                  {g.photo_url ? (
                    <Image source={{ uri: g.photo_url }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name="person" size={28} color="#10B981" />
                  )}
                </View>
                <View style={styles.guardianInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.guardianName, { color: textColor }]}>{g.name}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{g.status || 'ACTIVE'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.guardianMeta, { color: subColor }]}>
                    {g.relationship} • {g.mobile}
                  </Text>
                  {g.id_reference_masked ? (
                    <Text style={[styles.idMasked, { color: subColor }]}>
                      ID Ref: {g.id_reference_masked}
                    </Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.quickPassBtn, { borderColor }]}
                onPress={() => router.push('/Screen/studentPickup' as any)}
              >
                <Ionicons name="key-outline" size={14} color="#10B981" />
                <Text style={styles.quickPassText}>Generate Pickup Pass for {g.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Guardian Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Add Authorized Guardian</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={subColor} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Photo Picker */}
              <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.pickerImg} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color="#10B981" />
                    <Text style={styles.photoHint}>Attach Photo for Gate Verification</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.formLabel, { color: subColor }]}>FULL NAME *</Text>
              <TextInput
                style={[styles.formInput, { color: textColor, borderColor }]}
                placeholder="e.g. Anand Sharma"
                placeholderTextColor={subColor}
                value={name}
                onChangeText={setName}
              />

              <Text style={[styles.formLabel, { color: subColor }]}>RELATIONSHIP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relRow}>
                {RELATIONSHIPS.map((rel) => {
                  const isSelected = relationship === rel;
                  return (
                    <TouchableOpacity
                      key={rel}
                      style={[
                        styles.relChip,
                        {
                          backgroundColor: isSelected ? '#10B981' : 'transparent',
                          borderColor: isSelected ? '#10B981' : borderColor,
                        },
                      ]}
                      onPress={() => setRelationship(rel)}
                    >
                      <Text
                        style={[
                          styles.relChipText,
                          { color: isSelected ? '#FFFFFF' : textColor },
                        ]}
                      >
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.formLabel, { color: subColor }]}>PHONE NUMBER *</Text>
              <TextInput
                style={[styles.formInput, { color: textColor, borderColor }]}
                placeholder="e.g. 9876543210"
                placeholderTextColor={subColor}
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
              />

              <Text style={[styles.formLabel, { color: subColor }]}>GOVERNMENT ID (LAST 4 DIGITS)</Text>
              <TextInput
                style={[styles.formInput, { color: textColor, borderColor }]}
                placeholder="e.g. Aadhaar: XXXX-1234"
                placeholderTextColor={subColor}
                value={idReference}
                onChangeText={setIdReference}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddGuardian}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#059669', '#10B981']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtnGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Guardian</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  policyBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  policyText: { fontSize: 12, lineHeight: 17, flex: 1 },
  centerContainer: { padding: 40, alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  addFirstBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  addFirstBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  guardianCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  guardianRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  guardianInfo: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guardianName: { fontSize: 15, fontWeight: '700' },
  statusPill: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  guardianMeta: { fontSize: 13, marginTop: 2 },
  idMasked: { fontSize: 11, marginTop: 2 },
  quickPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickPassText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalScroll: { padding: 20 },
  photoPicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickerImg: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  photoHint: { fontSize: 9, color: '#10B981', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  formLabel: { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  relRow: { flexDirection: 'row', marginVertical: 6 },
  relChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  relChipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
