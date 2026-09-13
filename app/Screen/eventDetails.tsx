import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { eventService, type EventItem } from '@/src/services/eventService';
import QRCode from 'react-native-qrcode-svg';

export default function EventDetailsScreen() {
  const { id, studentId } = useLocalSearchParams<{ id: string; studentId?: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [passData, setPassData] = useState<any>(null);

  // Consent Form State
  const [medicalAck, setMedicalAck] = useState(true);
  const [treatmentAuth, setTreatmentAuth] = useState(true);
  const [transportConsent, setTransportConsent] = useState(true);
  const [mediaConsent, setMediaConsent] = useState(true);
  const [rulesAck, setRulesAck] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isConsented, setIsConsented] = useState(false);

  // Feedback State
  const [rating, setRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [evRes, passRes] = await Promise.all([
        eventService.getEventById(id).catch(() => null),
        eventService.getMyPass(id, studentId).catch(() => null),
      ]);

      if (evRes?.data) setEvent(evRes.data);

      if (passRes?.data) {
        setPassData(passRes.data);
        if (passRes.data.consent_status === 'CONSENTED') {
          setIsConsented(true);
        }
      }
    } catch (err) {
      console.warn('[EventDetails] Error loading details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, studentId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleSubmitConsent = async (status: 'CONSENTED' | 'DECLINED') => {
    if (!id) return;
    if (!studentId && !passData?.student_id) {
      Alert.alert('Student Required', 'No student profile selected for consent');
      return;
    }

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      await eventService.submitParentConsent(id, {
        studentId: studentId || passData.student_id,
        status,
        acknowledgements: {
          medical_declaration_ack: medicalAck,
          emergency_treatment_auth: treatmentAuth,
          transportation_consent: transportConsent,
          photography_media_consent: mediaConsent,
          rules_instructions_ack: rulesAck,
        },
        remarks: remarks.trim() || undefined,
      });

      setIsConsented(status === 'CONSENTED');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        status === 'CONSENTED' ? 'Consent Recorded' : 'Consent Declined',
        status === 'CONSENTED'
          ? 'Digital consent has been authenticated. Your child’s entry pass is now valid.'
          : 'You have declined consent for this event.'
      );
      loadEvent();
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit consent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!id) return;
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await eventService.submitFeedback(id, {
        overallRating: rating,
        responses: { rating, comments: feedbackComments },
        comments: feedbackComments.trim() || undefined,
      });
      setFeedbackSubmitted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thank You!', 'Your feedback has been submitted successfully.');
    } catch (err: any) {
      Alert.alert('Feedback Error', err?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
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
          <Text style={[styles.centerText, { color: subCol }]}>Loading Event Information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
        <View style={styles.centerBox}>
          <Text style={[styles.errorTitle, { color: textCol }]}>Event Not Found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const modules = event.config?.modules || {};

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textCol }]}>Event & Digital Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Event Card */}
        <View style={[styles.eventHeaderCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.eventTypePill, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
              <Text style={styles.eventTypeText}>{event.event_type?.replace(/_/g, ' ')}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: event.status === 'ONGOING' ? '#10B98122' : '#6366F122' }]}>
              <Text style={[styles.statusPillText, { color: event.status === 'ONGOING' ? '#10B981' : '#6366F1' }]}>
                {event.status}
              </Text>
            </View>
          </View>

          <Text style={[styles.eventTitle, { color: textCol }]}>{event.title}</Text>
          {event.description && (
            <Text style={[styles.eventDesc, { color: subCol }]}>{event.description}</Text>
          )}

          <View style={[styles.metaRow, { borderTopColor: borderCol }]}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6366F1" />
              <View>
                <Text style={[styles.metaLabel, { color: subCol }]}>Date</Text>
                <Text style={[styles.metaVal, { color: textCol }]}>
                  {new Date(event.start_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {event.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#EC4899" />
                <View>
                  <Text style={[styles.metaLabel, { color: subCol }]}>Venue</Text>
                  <Text style={[styles.metaVal, { color: textCol }]} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Pass Card (If pass exists) */}
        {passData && (
          <View style={[styles.passContainer, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.passHeaderGrad}
            >
              <View style={styles.passHeaderContent}>
                <Text style={styles.passHeaderTitle}>DIGITAL GATE PASS</Text>
                <Text style={styles.passCodeLarge}>{passData.pass_code}</Text>
              </View>
              <Ionicons name="qr-code" size={36} color="#FFF" />
            </LinearGradient>

            <View style={styles.passBody}>
              <View style={styles.passInfoRow}>
                <Text style={[styles.passInfoLabel, { color: subCol }]}>Attendee:</Text>
                <Text style={[styles.passInfoVal, { color: textCol }]}>
                  {passData.attendee_name || passData.student_name || 'Student'}
                </Text>
              </View>

              <View style={styles.passInfoRow}>
                <Text style={[styles.passInfoLabel, { color: subCol }]}>Pass Status:</Text>
                <Text style={[styles.passInfoVal, { color: passData.status === 'ACTIVE' ? '#10B981' : '#F59E0B' }]}>
                  {passData.status}
                </Text>
              </View>

              <View style={styles.passInfoRow}>
                <Text style={[styles.passInfoLabel, { color: subCol }]}>Consent Clearance:</Text>
                <Text style={[styles.passInfoVal, { color: isConsented ? '#10B981' : '#EF4444' }]}>
                  {isConsented ? 'CONSENTED' : 'PENDING SIGN-OFF'}
                </Text>
              </View>

              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <QRCode value={passData.pass_code} size={168} />
              </View>
              <Text style={[styles.qrInstructions, { color: subCol }]}>
                Present this QR at the gatekeeper checkpoint. The code does not contain personal data.
              </Text>
            </View>
          </View>
        )}

        {!passData && studentId && (event.status === 'PUBLISHED' || event.status === 'APPROVED' || event.status === 'REGISTRATION_OPEN' || event.status === 'ONGOING') && (
          <TouchableOpacity
            style={[styles.backButton, { marginHorizontal: 16, marginBottom: 12 }]}
            onPress={async () => {
              try {
                await eventService.registerStudent(id, { studentId });
                Alert.alert('Registered', 'Your child is registered. Complete consent and payment if required.');
                loadEvent();
              } catch (err: any) {
                Alert.alert('Registration', err?.message || 'Unable to register');
              }
            }}
          >
            <Text style={styles.backButtonText}>Register child</Text>
          </TouchableOpacity>
        )}

        {!!event.config?.constraints?.fee_amount && studentId && (
          <TouchableOpacity
            style={[styles.backButton, { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#0EA5E9' }]}
            onPress={async () => {
              try {
                await eventService.recordPayment(id, {
                  studentId,
                  amount: Number(event.config?.constraints?.fee_amount || 0),
                  paymentMethod: 'UPI',
                });
                Alert.alert('Payment recorded', 'Event fee marked as paid.');
                loadEvent();
              } catch (err: any) {
                Alert.alert('Payment', err?.message || 'Unable to record payment');
              }
            }}
          >
            <Text style={styles.backButtonText}>Record event fee</Text>
          </TouchableOpacity>
        )}

        {/* Digital Consent Form (When consent is required and not consented) */}
        {modules.consent && !isConsented && (
          <View style={[styles.consentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.consentTop}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.consentFormTitle, { color: textCol }]}>Parent Digital Consent</Text>
                <Text style={[styles.consentFormSub, { color: subCol }]}>
                  Authorized sign-off required prior to student participation
                </Text>
              </View>
            </View>

            {/* Checkbox / Switches */}
            {[
              { label: 'Medical Conditions & Allergies Declared', val: medicalAck, setVal: setMedicalAck },
              { label: 'Emergency Medical Treatment Authorization', val: treatmentAuth, setVal: setTreatmentAuth },
              { label: 'Transportation & Off-Campus Travel Consent', val: transportConsent, setVal: setTransportConsent },
              { label: 'School Media & Photography Release', val: mediaConsent, setVal: setMediaConsent },
              { label: 'School Behavioral Guidelines & Safety Rules Acknowledged', val: rulesAck, setVal: setRulesAck },
            ].map((item, idx) => (
              <View key={idx} style={[styles.consentRow, { borderBottomColor: borderCol }]}>
                <Text style={[styles.consentItemLabel, { color: textCol }]}>{item.label}</Text>
                <Switch
                  value={item.val}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    item.setVal(val);
                  }}
                  trackColor={{ false: '#4B5563', true: '#10B981' }}
                />
              </View>
            ))}

            {/* Medical / Emergency Remarks */}
            <Text style={[styles.remarksLabel, { color: subCol }]}>SPECIAL MEDICAL REMARKS / ALLERGIES</Text>
            <View style={[styles.remarksBox, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
              <TextInput
                placeholder="e.g., Inhaler in bag, allergic to penicillin or peanuts..."
                placeholderTextColor={subCol}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                style={[styles.remarksInput, { color: textCol }]}
              />
            </View>

            {/* Buttons */}
            <View style={styles.consentBtns}>
              <TouchableOpacity
                style={[styles.declineBtn, { borderColor: '#EF4444' }]}
                onPress={() => handleSubmitConsent('DECLINED')}
                disabled={submitting}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentSubmitBtn}
                onPress={() => handleSubmitConsent('CONSENTED')}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.consentSubmitGrad}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                      <Text style={styles.consentSubmitText}>Sign & Grant Consent</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Post-Event Feedback (If Event Concluded) */}
        {(event.status === 'COMPLETED' || event.status === 'CLOSED') && !feedbackSubmitted && (
          <View style={[styles.feedbackCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.feedbackTitle, { color: textCol }]}>Share Your Event Experience</Text>
            <Text style={[styles.feedbackSub, { color: subCol }]}>
              Help us improve future events by rating organization and safety.
            </Text>

            {/* Star Rating */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(star);
                  }}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Any additional feedback or compliments for the team..."
              placeholderTextColor={subCol}
              value={feedbackComments}
              onChangeText={setFeedbackComments}
              multiline
              numberOfLines={3}
              style={[styles.feedbackInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: textCol }]}
            />

            <TouchableOpacity
              style={styles.submitFeedbackBtn}
              onPress={handleSubmitFeedback}
              disabled={submitting}
            >
              <Text style={styles.submitFeedbackText}>Submit Review</Text>
            </TouchableOpacity>
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
  scrollContent: { padding: 16, paddingBottom: 60 },
  eventHeaderCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eventTypePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  eventTypeText: { color: '#6366F1', fontSize: 10, fontWeight: '800' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  eventTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  eventDesc: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontSize: 10, fontWeight: '700' },
  metaVal: { fontSize: 13, fontWeight: '700' },
  passContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  passHeaderGrad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  passHeaderContent: { flex: 1 },
  passHeaderTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  passCodeLarge: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: 1 },
  passBody: { padding: 16 },
  passInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  passInfoLabel: { fontSize: 12 },
  passInfoVal: { fontSize: 13, fontWeight: '800' },
  qrInstructions: { fontSize: 11, textAlign: 'center', marginTop: 12 },
  consentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  consentTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  consentFormTitle: { fontSize: 16, fontWeight: '800' },
  consentFormSub: { fontSize: 11, marginTop: 2 },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  consentItemLabel: { flex: 1, fontSize: 12, fontWeight: '600', marginRight: 10 },
  remarksLabel: { fontSize: 10, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  remarksBox: { borderRadius: 10, padding: 10 },
  remarksInput: { fontSize: 12, height: 60, textAlignVertical: 'top' },
  consentBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  consentSubmitBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  consentSubmitGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  consentSubmitText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  feedbackCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  feedbackTitle: { fontSize: 15, fontWeight: '800' },
  feedbackSub: { fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  feedbackInput: {
    width: '100%',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    height: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitFeedbackBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitFeedbackText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 13, marginTop: 10 },
  errorTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  backButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
});
