import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/src/utils/haptics';
import { useTheme } from '@/src/hooks/useTheme';
import { eventService, type EventItem } from '@/src/services/eventService';

const EVENT_TYPES = [
  { id: 'SCHOOL_EVENT', label: 'School Event', icon: 'flag-outline' },
  { id: 'SPORTS', label: 'Sports Meet', icon: 'trophy-outline' },
  { id: 'COMPETITION', label: 'Competition', icon: 'medal-outline' },
  { id: 'TRIP', label: 'Field Trip / Excursion', icon: 'bus-outline' },
  { id: 'CELEBRATION', label: 'Annual / Cultural', icon: 'sparkles-outline' },
  { id: 'STAFF_MEETING', label: 'Staff Seminar', icon: 'people-outline' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // Step wizard: 1 = Basics, 2 = Schedules & Capacity, 3 = Modules
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('TRIP');
  const [category, setCategory] = useState('ACADEMIC');
  const [location, setLocation] = useState('');

  // Dates
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState('17:00:00');

  // Constraints
  const [maxCapacity, setMaxCapacity] = useState('100');
  const [minStaffRequired, setMinStaffRequired] = useState('4');
  const [feeAmount, setFeeAmount] = useState('0');

  // Operational Modules
  const [modRegistration, setModRegistration] = useState(true);
  const [modConsent, setModConsent] = useState(true);
  const [modTicketing, setModTicketing] = useState(true);
  const [modTransport, setModTransport] = useState(true);
  const [modCompetition, setModCompetition] = useState(false);
  const [modBudget, setModBudget] = useState(true);
  const [modFeedback, setModFeedback] = useState(true);
  const [modCertificates, setModCertificates] = useState(true);

  useEffect(() => {
    eventService.getTemplates().then((res) => {
      if (res?.data) setTemplates(res.data);
    }).catch(() => {});
  }, []);

  const applyTemplate = (tpl: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTitle(tpl.name || '');
    setDescription(tpl.description || '');
    if (tpl.event_type) setEventType(tpl.event_type);
    if (tpl.default_config) {
      const cfg = tpl.default_config;
      if (cfg.modules) {
        setModConsent(!!cfg.modules.consent);
        setModTicketing(!!cfg.modules.ticketing);
        setModTransport(!!cfg.modules.transport);
        setModCompetition(!!cfg.modules.competition);
        setModBudget(!!cfg.modules.budget);
        setModFeedback(!!cfg.modules.feedback);
        setModCertificates(!!cfg.modules.certificates);
      }
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter an event title');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const payload: Partial<EventItem> = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        category,
        location: location.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        config: {
          modules: {
            registration: modRegistration,
            consent: modConsent,
            ticketing: modTicketing,
            qr_passes: modTicketing,
            transport: modTransport,
            competition: modCompetition,
            budget: modBudget,
            expenses: modBudget,
            payments: parseFloat(feeAmount) > 0,
            feedback: modFeedback,
            certificates: modCertificates,
          },
          constraints: {
            max_capacity: parseInt(maxCapacity, 10) || 100,
            min_staff_required: parseInt(minStaffRequired, 10) || 2,
            fee_amount: parseFloat(feeAmount) || 0,
            requires_consent: modConsent,
          },
        },
      };

      const res = await eventService.createEvent(payload);
      if (res?.data?.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/admin/events/${res.data.id}`);
      } else {
        throw new Error('Failed to create event');
      }
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Unable to create event');
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? '#090D16' : '#F8FAFC';
  const cardBg = isDark ? '#111827' : '#FFFFFF';
  const textCol = isDark ? '#F9FAFB' : '#0F172A';
  const subCol = isDark ? '#9CA3AF' : '#64748B';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: borderCol }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons name="arrow-back" size={20} color={textCol} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: textCol }]}>New Paperless Event</Text>
          <Text style={[styles.headerSub, { color: subCol }]}>Step {step} of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Step Indicator */}
      <View style={[styles.stepBar, { borderBottomColor: borderCol }]}>
        {[
          { num: 1, label: 'Basics' },
          { num: 2, label: 'Schedule & Capacity' },
          { num: 3, label: 'Operations' },
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <TouchableOpacity
              key={s.num}
              style={styles.stepItem}
              onPress={() => setStep(s.num)}
            >
              <View
                style={[
                  styles.stepCircle,
                  active && { backgroundColor: '#4F46E5' },
                  completed && { backgroundColor: '#10B981' },
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={[styles.stepCircleText, active && { color: '#FFF' }]}>{s.num}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, active && { color: '#4F46E5', fontWeight: '800' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View>
            {/* Quick Templates */}
            {templates.length > 0 && (
              <View style={styles.templateSection}>
                <Text style={[styles.fieldLabel, { color: subCol }]}>PRELOAD FROM TEMPLATE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
                  {templates.slice(0, 5).map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.templateChip, { backgroundColor: cardBg, borderColor: borderCol }]}
                      onPress={() => applyTemplate(tpl)}
                    >
                      <Ionicons name="flash-outline" size={14} color="#6366F1" />
                      <Text style={[styles.templateChipText, { color: textCol }]}>{tpl.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Event Type Grid */}
            <Text style={[styles.fieldLabel, { color: subCol }]}>EVENT TYPE</Text>
            <View style={styles.typeGrid}>
              {EVENT_TYPES.map((t) => {
                const selected = eventType === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeCard,
                      { backgroundColor: cardBg, borderColor: selected ? '#4F46E5' : borderCol },
                      selected && { backgroundColor: isDark ? 'rgba(79,70,229,0.2)' : 'rgba(79,70,229,0.08)' },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setEventType(t.id);
                      if (t.id === 'SPORTS') setModCompetition(true);
                    }}
                  >
                    <Ionicons name={t.icon as any} size={20} color={selected ? '#4F46E5' : subCol} />
                    <Text style={[styles.typeCardText, { color: selected ? '#4F46E5' : textCol }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={[styles.fieldLabel, { color: subCol, marginTop: 16 }]}>EVENT TITLE *</Text>
            <View style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <TextInput
                placeholder="e.g., Annual Sports Day 2026 or Science Museum Excursion"
                placeholderTextColor={subCol}
                value={title}
                onChangeText={setTitle}
                style={[styles.input, { color: textCol }]}
              />
            </View>

            {/* Venue / Location */}
            <Text style={[styles.fieldLabel, { color: subCol, marginTop: 14 }]}>LOCATION / VENUE</Text>
            <View style={[styles.inputBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Ionicons name="location-outline" size={18} color={subCol} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="e.g., Main Athletic Ground, Block B Auditorium, or Excursion Venue"
                placeholderTextColor={subCol}
                value={location}
                onChangeText={setLocation}
                style={[styles.input, { color: textCol }]}
              />
            </View>

            {/* Description */}
            <Text style={[styles.fieldLabel, { color: subCol, marginTop: 14 }]}>DESCRIPTION & PURPOSE</Text>
            <View style={[styles.textAreaBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <TextInput
                placeholder="Outline objectives, itinerary notes, and student instructions..."
                placeholderTextColor={subCol}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={[styles.textArea, { color: textCol }]}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.fieldLabel, { color: subCol }]}>START DATE & TIME (YYYY-MM-DD)</Text>
            <View style={styles.dateTimeRow}>
              <View style={[styles.inputBox, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  style={[styles.input, { color: textCol }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={subCol}
                />
              </View>
              <View style={[styles.inputBox, { width: 120, backgroundColor: cardBg, borderColor: borderCol }]}>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  style={[styles.input, { color: textCol }]}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={subCol}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: subCol, marginTop: 14 }]}>END DATE & TIME</Text>
            <View style={styles.dateTimeRow}>
              <View style={[styles.inputBox, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  style={[styles.input, { color: textCol }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={subCol}
                />
              </View>
              <View style={[styles.inputBox, { width: 120, backgroundColor: cardBg, borderColor: borderCol }]}>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  style={[styles.input, { color: textCol }]}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={subCol}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: subCol, marginTop: 20 }]}>PARTICIPATION & LOGISTIC LIMITS</Text>
            <View style={styles.constraintsRow}>
              <View style={[styles.constraintBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.constraintTitle, { color: subCol }]}>MAX CAPACITY</Text>
                <TextInput
                  value={maxCapacity}
                  onChangeText={setMaxCapacity}
                  keyboardType="numeric"
                  style={[styles.constraintInput, { color: textCol }]}
                />
                <Text style={[styles.constraintSub, { color: subCol }]}>Waitlists beyond</Text>
              </View>

              <View style={[styles.constraintBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.constraintTitle, { color: subCol }]}>MIN STAFF</Text>
                <TextInput
                  value={minStaffRequired}
                  onChangeText={setMinStaffRequired}
                  keyboardType="numeric"
                  style={[styles.constraintInput, { color: textCol }]}
                />
                <Text style={[styles.constraintSub, { color: subCol }]}>Supervisors</Text>
              </View>

              <View style={[styles.constraintBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.constraintTitle, { color: subCol }]}>FEE (₹)</Text>
                <TextInput
                  value={feeAmount}
                  onChangeText={setFeeAmount}
                  keyboardType="numeric"
                  style={[styles.constraintInput, { color: textCol }]}
                />
                <Text style={[styles.constraintSub, { color: subCol }]}>0 = Free</Text>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.fieldLabel, { color: subCol }]}>SELECT ACTIVE MODULES FOR THIS EVENT</Text>
            <Text style={[styles.sectionDesc, { color: subCol }]}>
              Enable the paperless operational pipelines required for complete automated governance.
            </Text>

            {[
              {
                title: 'Parent Digital Consent',
                desc: 'Digital sign-off with medical declarations & emergency authorizations',
                val: modConsent,
                setVal: setModConsent,
                icon: 'shield-checkmark',
                col: '#10B981',
              },
              {
                title: 'Cryptographic QR Entry Passes',
                desc: 'Anti-replay QR passes scanned at gatekeeper with instant verification',
                val: modTicketing,
                setVal: setModTicketing,
                icon: 'qr-code',
                col: '#6366F1',
              },
              {
                title: 'Bus Transport & Manifests',
                desc: 'Vehicle allocation, route scheduling & mobile boarding roll-call',
                val: modTransport,
                setVal: setModTransport,
                icon: 'bus',
                col: '#F59E0B',
              },
              {
                title: 'Sports & Competition Engine',
                desc: 'Live scoring, house points calculation & automated rank leaderboards',
                val: modCompetition,
                setVal: setModCompetition,
                icon: 'trophy',
                col: '#EC4899',
              },
              {
                title: 'Budget & Vendor Expenses',
                desc: 'Cost estimation, quotation comparison & finance accounts integration',
                val: modBudget,
                setVal: setModBudget,
                icon: 'wallet',
                col: '#06B6D4',
              },
              {
                title: 'Post-Event Feedback Survey',
                desc: 'Automated survey collection and rating analytics for parents & staff',
                val: modFeedback,
                setVal: setModFeedback,
                icon: 'chatbubbles',
                col: '#8B5CF6',
              },
              {
                title: 'Digital Certificate Generator',
                desc: 'Tamper-proof verifiable certificates issued to attendees and winners',
                val: modCertificates,
                setVal: setModCertificates,
                icon: 'ribbon',
                col: '#3B82F6',
              },
            ].map((m, idx) => (
              <View
                key={idx}
                style={[styles.moduleCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              >
                <View style={[styles.moduleIconWrap, { backgroundColor: `${m.col}18` }]}>
                  <Ionicons name={m.icon as any} size={20} color={m.col} />
                </View>
                <View style={styles.moduleTextWrap}>
                  <Text style={[styles.moduleTitle, { color: textCol }]}>{m.title}</Text>
                  <Text style={[styles.moduleDesc, { color: subCol }]}>{m.desc}</Text>
                </View>
                <Switch
                  value={m.val}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    m.setVal(val);
                  }}
                  trackColor={{ false: '#4B5563', true: m.col }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Nav Bar */}
      <View style={[styles.bottomBar, { backgroundColor: cardBg, borderTopColor: borderCol }]}>
        {step > 1 ? (
          <TouchableOpacity
            style={[styles.backStepBtn, { borderColor: borderCol }]}
            onPress={() => setStep((s) => s - 1)}
          >
            <Ionicons name="arrow-back" size={16} color={textCol} />
            <Text style={[styles.backStepText, { color: textCol }]}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < 3 ? (
          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={() => {
              if (step === 1 && !title.trim()) {
                Alert.alert('Required', 'Please enter an event title');
                return;
              }
              setStep((s) => s + 1);
            }}
          >
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextStepGrad}
            >
              <Text style={styles.nextStepText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={handleCreate}
            disabled={saving}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextStepGrad}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.nextStepText}>Launch Event</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
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
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 2 },
  stepBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  stepLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  templateSection: { marginBottom: 16 },
  templateScroll: { gap: 8, marginTop: 6 },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  templateChipText: { fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  sectionDesc: { fontSize: 12, marginBottom: 14, lineHeight: 18 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    width: '31%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    gap: 6,
  },
  typeCardText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 13, padding: 0 },
  textAreaBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textArea: { fontSize: 13, height: 80, textAlignVertical: 'top' },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  constraintsRow: { flexDirection: 'row', gap: 10 },
  constraintBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  constraintTitle: { fontSize: 9, fontWeight: '800' },
  constraintInput: { fontSize: 20, fontWeight: '900', marginVertical: 4, textAlign: 'center' },
  constraintSub: { fontSize: 9 },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  moduleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleTextWrap: { flex: 1, marginRight: 10 },
  moduleTitle: { fontSize: 13, fontWeight: '800' },
  moduleDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backStepText: { fontSize: 13, fontWeight: '700' },
  nextStepBtn: { borderRadius: 12, overflow: 'hidden', minWidth: 130 },
  nextStepGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  nextStepText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});
