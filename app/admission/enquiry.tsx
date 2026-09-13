import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { admissionService, type PublicFormConfigResponse, type DuplicateCheckResult } from '../../src/services/admissionService';
import { showAlert } from '../../src/components/CustomAlert';

export default function AdmissionEnquiryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formConfig, setFormConfig] = useState<PublicFormConfigResponse | null>(null);

  // Form inputs
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [source, setSource] = useState('Website');
  const [notes, setNotes] = useState('');

  // Duplicate Check Modal State
  const [duplicateModal, setDuplicateModal] = useState<DuplicateCheckResult | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    applicationNo?: string;
    email?: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await admissionService.getPublicFormConfig();
      setFormConfig(data);
      if (data.classes?.length > 0) {
        setSelectedClassId(data.classes[0].id);
      }
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Failed to load school admission configuration.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (phone.replace(/\D/g, '').length >= 10) {
      try {
        const check = await admissionService.checkDuplicate({
          phone,
          studentFirstName: studentName,
        });
        if (check.isPotentialDuplicate) {
          setDuplicateModal(check);
        }
      } catch {
        // Soft fail
      }
    }
  };

  const handleSubmit = async () => {
    if (!parentName.trim() || !studentName.trim() || !phone.trim()) {
      showAlert({
        type: 'warning',
        title: 'Required Fields',
        message: 'Please provide parent name, student name, and mobile number.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await admissionService.submitEnquiry({
        parent_name: parentName,
        student_name: studentName,
        phone,
        email: email || undefined,
        interested_class_id: selectedClassId || undefined,
        academic_year_id: formConfig?.academicYear?.id || undefined,
        source,
        notes,
        create_applicant_account: true,
        force_new: Boolean(duplicateModal),
      });

      if (res.isPotentialDuplicate && res.duplicates) {
        setDuplicateModal(res.duplicates);
        return;
      }

      if (res.applicantCredentials || res.application) {
        setCreatedCredentials({
          applicationNo: res.application?.application_no || 'Pending',
          email: res.applicantCredentials?.email,
          password: res.applicantCredentials?.password,
        });
      } else {
        showAlert({
          type: 'success',
          title: 'Enquiry Received',
          message: 'Thank you! The school admission desk will reach out to you shortly.',
        });
        resetForm();
      }
    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Submission Failed',
        message: err?.message || 'Could not submit enquiry. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setParentName('');
    setStudentName('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading admission portal...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Hero */}
        <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.heroBanner}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/admission/login')} style={styles.loginLinkButton}>
              <Text style={styles.loginLinkText}>Applicant Sign In</Text>
              <Ionicons name="log-in-outline" size={18} color="#93C5FD" />
            </TouchableOpacity>
          </View>
          <Text style={styles.schoolName}>{formConfig?.school?.name || 'School Admission'}</Text>
          <Text style={styles.heroTitle}>Admission Enquiry & Registration</Text>
          <Text style={styles.heroSubtitle}>
            Academic Session {formConfig?.academicYear?.name || '2026–27'} • Start your seamless digital application
          </Text>
        </LinearGradient>

        {/* Duplicate Alert Banner if flagged */}
        {duplicateModal && (
          <View style={styles.duplicateBanner}>
            <Ionicons name="alert-circle" size={24} color="#D97706" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.duplicateTitle}>Existing Application Detected</Text>
              <Text style={styles.duplicateDesc}>
                We found an existing record ({duplicateModal.matches[0]?.applicationNo || 'Active Application'}) matching your phone number.
              </Text>
              <View style={styles.duplicateActions}>
                <TouchableOpacity
                  style={styles.continueAppBtn}
                  onPress={() => router.push('/admission/login')}
                >
                  <Text style={styles.continueAppBtnText}>Continue Existing Application</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => setDuplicateModal(null)}
                >
                  <Text style={styles.dismissBtnText}>Create New</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeader}>Prospective Student Information</Text>

          <Text style={styles.inputLabel}>Student Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Aarav Sharma"
            placeholderTextColor="#94A3B8"
            value={studentName}
            onChangeText={setStudentName}
          />

          <Text style={styles.inputLabel}>Applying for Grade / Class *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classPickerScroll}>
            {formConfig?.classes?.map((c) => {
              const selected = selectedClassId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.classChip, selected && styles.classChipSelected]}
                  onPress={() => setSelectedClassId(c.id)}
                >
                  <Text style={[styles.classChipText, selected && styles.classChipTextSelected]}>
                    Class {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Parent / Guardian Details</Text>

          <Text style={styles.inputLabel}>Parent / Guardian Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rajesh Sharma"
            placeholderTextColor="#94A3B8"
            value={parentName}
            onChangeText={setParentName}
          />

          <Text style={styles.inputLabel}>Contact Mobile Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onBlur={handlePhoneBlur}
          />

          <Text style={styles.inputLabel}>Email Address (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="parent@example.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>How did you hear about us?</Text>
          <View style={styles.sourceGrid}>
            {['Website', 'Word of Mouth', 'Referral', 'Social Media', 'Walk-in'].map((src) => {
              const selected = source === src;
              return (
                <TouchableOpacity
                  key={src}
                  style={[styles.sourceChip, selected && styles.sourceChipSelected]}
                  onPress={() => setSource(src)}
                >
                  <Text style={[styles.sourceChipText, selected && styles.sourceChipTextSelected]}>
                    {src}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Questions or Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any specific academic questions, transportation queries, or medical notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Admission Enquiry</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Account Created Success Modal */}
      {createdCredentials && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIconBubble}>
              <Ionicons name="checkmark-circle" size={54} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Application Registered!</Text>
            <Text style={styles.modalSubtitle}>
              Your admission account has been created successfully. You can track application progress and submit documents anytime.
            </Text>

            <View style={styles.credentialBox}>
              <Text style={styles.credentialLabel}>Application Number:</Text>
              <Text style={styles.credentialValue}>{createdCredentials.applicationNo}</Text>

              {createdCredentials.email && (
                <>
                  <Text style={[styles.credentialLabel, { marginTop: 8 }]}>Login User / Email:</Text>
                  <Text style={styles.credentialValue}>{createdCredentials.email}</Text>
                </>
              )}

              {createdCredentials.password && (
                <>
                  <Text style={[styles.credentialLabel, { marginTop: 8 }]}>Temporary Password:</Text>
                  <Text style={styles.credentialValue}>{createdCredentials.password}</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setCreatedCredentials(null);
                router.push('/admission/login');
              }}
            >
              <Text style={styles.modalActionBtnText}>Proceed to Admission Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748B', fontWeight: '500' },
  scrollContent: { paddingBottom: 40 },
  heroBanner: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  loginLinkButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  loginLinkText: { color: '#DBEAFE', fontSize: 13, fontWeight: '600', marginRight: 4 },
  schoolName: { color: '#93C5FD', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 4 },
  heroSubtitle: { color: '#C7D2FE', fontSize: 14, marginTop: 6, lineHeight: 20 },
  duplicateBanner: { margin: 16, padding: 16, backgroundColor: '#FEF3C7', borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'flex-start' },
  duplicateTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
  duplicateDesc: { fontSize: 13, color: '#B45309', marginTop: 4, lineHeight: 18 },
  duplicateActions: { flexDirection: 'row', marginTop: 10 },
  continueAppBtn: { backgroundColor: '#D97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  continueAppBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dismissBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#D97706' },
  dismissBtnText: { color: '#D97706', fontSize: 12, fontWeight: '600' },
  formCard: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  sectionHeader: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  classPickerScroll: { flexDirection: 'row', marginTop: 6 },
  classChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  classChipSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  classChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  classChipTextSelected: { color: '#FFFFFF' },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  sourceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  sourceChipSelected: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  sourceChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  sourceChipTextSelected: { color: '#4F46E5' },
  submitButton: { backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, alignItems: 'center' },
  successIconBubble: { marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  credentialBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, width: '100%', marginVertical: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  credentialLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  credentialValue: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  modalActionBtn: { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  modalActionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
