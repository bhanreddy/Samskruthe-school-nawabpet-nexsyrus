import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import * as Haptics from '../../utils/haptics';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { StudentService } from '../../services/studentService';
import { AnecdoteService, InferredAnecdote, ObservationCategory } from '../../services/anecdoteService';
import { AnecdoteOfflineQueue, newAnecdoteClientId } from '../../services/anecdoteOfflineQueue';
import StudentPhoto from '../StudentPhoto';

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');
const RECENT_STUDENTS_KEY = '@schoolims_anecdote_recent_students';

const CONTEXT_OPTIONS = ['Classroom', 'Playground', 'Laboratory', 'Corridor', 'Assembly', 'Bus / Transport', 'Sports Ground', 'Library', 'Dining Hall'];
const TYPE_OPTIONS = [
  { key: 'OBSERVATION', label: 'Observation', icon: 'eye-outline', color: '#6366F1' },
  { key: 'RECOGNITION', label: 'Recognition', icon: 'ribbon-outline', color: '#10B981' },
  { key: 'IMPROVEMENT', label: 'Improvement', icon: 'trending-up-outline', color: '#3B82F6' },
  { key: 'CONCERN', label: 'Concern', icon: 'alert-circle-outline', color: '#F59E0B' },
  { key: 'INCIDENT', label: 'Incident', icon: 'warning-outline', color: '#EF4444' },
  { key: 'ACHIEVEMENT', label: 'Achievement', icon: 'trophy-outline', color: '#EC4899' },
];

const SEVERITY_OPTIONS = [
  { key: 'LEVEL_0_INFORMATIONAL', label: 'L0 Info', color: '#94A3B8' },
  { key: 'LEVEL_1_POSITIVE', label: 'L1 Positive', color: '#10B981' },
  { key: 'LEVEL_2_WATCH', label: 'L2 Watch', color: '#F59E0B' },
  { key: 'LEVEL_3_ATTENTION', label: 'L3 Attention', color: '#EA580C' },
  { key: 'LEVEL_4_CRITICAL', label: 'L4 Critical', color: '#EF4444' },
];

export interface StudentOption {
  id: string;
  display_name: string;
  admission_no?: string;
  photo_url?: string | null;
  class_name?: string;
}

interface AnecdoteQuickModalProps {
  visible: boolean;
  preselectedStudent?: StudentOption | null;
  onClose: () => void;
  onSuccess?: (anecdote: any) => void;
}

export const AnecdoteQuickModal: React.FC<AnecdoteQuickModalProps> = ({
  visible,
  preselectedStudent,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();

  // Student selection state
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(preselectedStudent || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentOption[]>([]);
  const [recentStudents, setRecentStudents] = useState<StudentOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(!preselectedStudent);

  // Form fields
  const [observation, setObservation] = useState('');
  const [context, setContext] = useState('Classroom');
  const [observationType, setObservationType] = useState('OBSERVATION');
  const [severity, setSeverity] = useState('LEVEL_0_INFORMATIONAL');
  const [selectedCategory, setSelectedCategory] = useState<ObservationCategory | null>(null);
  const [categories, setCategories] = useState<ObservationCategory[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);

  // Inference state
  const [isInferring, setIsInferring] = useState(false);
  const [hasUserCustomized, setHasUserCustomized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize
  useEffect(() => {
    if (visible) {
      loadTaxonomy();
      loadRecentStudents();
      if (preselectedStudent) {
        setSelectedStudent(preselectedStudent);
        setShowStudentPicker(false);
      } else {
        setShowStudentPicker(true);
      }
    } else {
      resetForm();
    }
  }, [visible, preselectedStudent]);

  const loadTaxonomy = async () => {
    try {
      const data = await AnecdoteService.getTaxonomy();
      setCategories(data?.categories || []);
    } catch {
      // Fallback handled silently
    }
  };

  const loadRecentStudents = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_STUDENTS_KEY);
      if (raw) {
        setRecentStudents(JSON.parse(raw));
      }
    } catch {
      // Ignore storage error
    }
  };

  const saveRecentStudent = async (student: StudentOption) => {
    try {
      const updated = [student, ...recentStudents.filter((s) => s.id !== student.id)].slice(0, 5);
      setRecentStudents(updated);
      await AsyncStorage.setItem(RECENT_STUDENTS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  };

  const resetForm = () => {
    setObservation('');
    setContext('Classroom');
    setObservationType('OBSERVATION');
    setSeverity('LEVEL_0_INFORMATIONAL');
    setSelectedCategory(null);
    setSkills([]);
    setEvidenceUri(null);
    setSearchQuery('');
    setSearchResults([]);
    setHasUserCustomized(false);
    setIsSubmitting(false);
  };

  // Search students
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await StudentService.search(searchQuery.trim(), 8);
        const mapped = results.map((s: any) => ({
          id: s.id,
          display_name: s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
          admission_no: s.admission_no,
          photo_url: s.photo_url || s.profile_photo_url || null,
        }));
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Real-time inference on observation text (debounced)
  useEffect(() => {
    if (observation.trim().length < 8 || hasUserCustomized) return;

    const timer = setTimeout(async () => {
      setIsInferring(true);
      try {
        const inferred: InferredAnecdote = await AnecdoteService.inferAnecdote(observation);
        if (inferred && !hasUserCustomized) {
          if (inferred.observation_type) setObservationType(inferred.observation_type);
          if (inferred.context) setContext(inferred.context);
          if (inferred.severity) setSeverity(inferred.severity);
          if (inferred.skills && Array.isArray(inferred.skills)) setSkills(inferred.skills);

          if (inferred.category_code && categories.length > 0) {
            const matched = categories.find((c) => c.code === inferred.category_code);
            if (matched) setSelectedCategory(matched);
          }
        }
      } catch {
        // Silently skip if infer fails
      } finally {
        setIsInferring(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [observation, hasUserCustomized, categories]);

  const handlePickEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setEvidenceUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      alertCompat('Error', 'Unable to pick image. Please check permissions.');
    }
  };

  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setShowStudentPicker(false);
    saveRecentStudent(student);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      alertCompat('Select Student', 'Please select a student for this observation.');
      return;
    }
    if (!observation.trim()) {
      alertCompat('Enter Observation', 'Please describe what you observed.');
      return;
    }

    setIsSubmitting(true);
    const clientId = newAnecdoteClientId();
    const payload = {
      client_generated_id: clientId,
      student_id: selectedStudent.id,
      category_id: selectedCategory?.id,
      observation_text: observation.trim(),
      observation_type: observationType,
      context,
      severity,
      skills,
      visibility: 'STAFF_ONLY',
      observed_at: new Date().toISOString(),
    };

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const created = await AnecdoteService.createAnecdote(payload);

      // Upload evidence if attached
      if (evidenceUri && created?.id) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: evidenceUri,
            name: `evidence_${Date.now()}.jpg`,
            type: 'image/jpeg',
          } as any);
          formData.append('title', 'Observation Photo');
          await AnecdoteService.uploadEvidence(created.id, formData);
        } catch {
          // Evidence upload error does not block observation save
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alertCompat('Observation Saved', 'The observation was recorded and intelligence is being evaluated.');
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err: any) {
      // Offline fallback
      try {
        await AnecdoteOfflineQueue.enqueueObservation({
          client_generated_id: clientId,
          student_id: selectedStudent.id,
          observation_text: observation.trim(),
          category_id: selectedCategory?.id,
          observation_type: observationType,
          context,
          severity,
          skills,
          observed_at: new Date().toISOString(),
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        alertCompat('Saved Offline', 'Saved locally. It will automatically sync when connection returns.');
        if (onSuccess) onSuccess({ id: clientId, is_offline: true, ...payload });
        onClose();
      } catch (enqueueErr) {
        alertCompat('Save Failed', 'Could not save observation. Please check storage and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'md');
  const insetStyle = clayInset(isDark, false);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.headerIconBadge}>
                <Ionicons name="sparkles" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  New Observation
                </Text>
                <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Anecdote Intelligence Engine
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
              <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Student Selector Card */}
            <View style={[cardStyle, styles.sectionCard]}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                STUDENT
              </Text>
              {selectedStudent ? (
                <View style={styles.selectedStudentRow}>
                  <View style={styles.studentInfo}>
                    <StudentPhoto
                      photoUrl={selectedStudent.photo_url}
                      size={44}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={[styles.studentName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                        {selectedStudent.display_name}
                      </Text>
                      {selectedStudent.admission_no ? (
                        <Text style={[styles.studentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          Adm #{selectedStudent.admission_no}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowStudentPicker(true)}
                    style={[styles.changeStudentBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  >
                    <Text style={[styles.changeStudentText, { color: primaryColor }]}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowStudentPicker(true)}
                  style={[styles.chooseStudentTrigger, insetStyle]}
                >
                  <Ionicons name="person-add-outline" size={20} color={primaryColor} />
                  <Text style={[styles.chooseStudentText, { color: primaryColor }]}>
                    Select Student to Observe
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Student Search Picker Drawer/Section */}
            {showStudentPicker && (
              <View style={[cardStyle, styles.sectionCard, { marginTop: 12 }]}>
                <View style={styles.pickerSearchHeader}>
                  <Ionicons name="search-outline" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                  <TextInput
                    style={[styles.pickerSearchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="Search name or admission no..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={!selectedStudent}
                  />
                  {isSearching ? <ActivityIndicator size="small" color={primaryColor} /> : null}
                </View>

                {/* Search Results */}
                {searchResults.length > 0 ? (
                  <View style={styles.resultsList}>
                    {searchResults.map((st) => (
                      <TouchableOpacity
                        key={st.id}
                        style={styles.pickerStudentItem}
                        onPress={() => handleSelectStudent(st)}
                      >
                        <StudentPhoto photoUrl={st.photo_url} size={36} />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={[styles.pickerStudentName, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                            {st.display_name}
                          </Text>
                          <Text style={[styles.pickerStudentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            {st.admission_no ? `Adm: ${st.admission_no}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : '#CBD5E1'} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {/* Recents */}
                {searchQuery.trim() === '' && recentStudents.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.recentHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      RECENT STUDENTS
                    </Text>
                    <View style={styles.recentChipsRow}>
                      {recentStudents.map((st) => (
                        <TouchableOpacity
                          key={st.id}
                          style={[styles.recentChip, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                          onPress={() => handleSelectStudent(st)}
                        >
                          <Text style={[styles.recentChipText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                            {st.display_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Observation Text Input */}
            <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
              <View style={styles.labelRow}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  WHAT DID YOU OBSERVE?
                </Text>
                {isInferring && (
                  <View style={styles.inferringPill}>
                    <ActivityIndicator size="small" color="#8B5CF6" style={{ transform: [{ scale: 0.7 }] }} />
                    <Text style={styles.inferringText}>Structuring...</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[
                  insetStyle,
                  styles.observationInput,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
                placeholder="e.g. Rahul helped two classmates solve a difficult math problem during the group activity."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={4}
                value={observation}
                onChangeText={setObservation}
              />

              {/* Inferred Taxonomy Banner */}
              {selectedCategory && (
                <View style={[styles.inferredBanner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                  <Ionicons name="bulb-outline" size={16} color="#6366F1" />
                  <Text style={[styles.inferredBannerText, { color: isDark ? '#C7D2FE' : '#4338CA' }]}>
                    Inferred: {selectedCategory.name} • {observationType}
                  </Text>
                </View>
              )}
            </View>

            {/* Context & Type Selectors */}
            <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                OBSERVATION TYPE
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {TYPE_OPTIONS.map((item) => {
                  const active = observationType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        setObservationType(item.key);
                        setHasUserCustomized(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.chipButton,
                        {
                          backgroundColor: active
                            ? item.color
                            : isDark
                            ? '#1E293B'
                            : '#F1F5F9',
                          borderColor: active ? item.color : isDark ? '#334155' : '#CBD5E1',
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={14}
                        color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.chipButtonText,
                          { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 14 }]}>
                CONTEXT / LOCATION
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {CONTEXT_OPTIONS.map((ctx) => {
                  const active = context === ctx;
                  return (
                    <TouchableOpacity
                      key={ctx}
                      onPress={() => {
                        setContext(ctx);
                        setHasUserCustomized(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.chipButton,
                        {
                          backgroundColor: active
                            ? primaryColor
                            : isDark
                            ? '#1E293B'
                            : '#F1F5F9',
                          borderColor: active ? primaryColor : isDark ? '#334155' : '#CBD5E1',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipButtonText,
                          { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' },
                        ]}
                      >
                        {ctx}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 14 }]}>
                SEVERITY / SIGNAL LEVEL
              </Text>
              <View style={styles.severityGrid}>
                {SEVERITY_OPTIONS.map((item) => {
                  const active = severity === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        setSeverity(item.key);
                        setHasUserCustomized(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.severityPill,
                        {
                          backgroundColor: active ? item.color : isDark ? '#1E293B' : '#F1F5F9',
                          borderColor: active ? item.color : isDark ? '#334155' : '#CBD5E1',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: active ? '#FFF' : isDark ? '#94A3B8' : '#64748B' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Evidence Attachment */}
            <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                EVIDENCE (OPTIONAL)
              </Text>
              {evidenceUri ? (
                <View style={styles.evidencePreviewContainer}>
                  <Image source={{ uri: evidenceUri }} style={styles.evidenceImage} />
                  <TouchableOpacity
                    onPress={() => setEvidenceUri(null)}
                    style={styles.removeEvidenceBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickEvidence}
                  style={[styles.evidenceUploadBtn, insetStyle]}
                >
                  <Ionicons name="camera-outline" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text style={[styles.evidenceUploadText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    Attach Photo / Work Sample
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Action Dock */}
          <View style={[styles.footerDock, { borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.saveButton,
                { opacity: isSubmitting ? 0.7 : 1 },
              ]}
            >
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Observation</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: WIN_H * 0.9,
    minHeight: WIN_H * 0.75,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  selectedStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
  },
  studentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  changeStudentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeStudentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chooseStudentTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  chooseStudentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  resultsList: {
    marginTop: 8,
  },
  pickerStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  pickerStudentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerStudentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  recentHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recentChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inferringPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inferringText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  observationInput: {
    minHeight: 88,
    padding: 12,
    borderRadius: 14,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  inferredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inferredBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsScroll: {
    marginHorizontal: -4,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  chipButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  severityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  evidenceUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  evidenceUploadText: {
    fontSize: 13,
    fontWeight: '500',
  },
  evidencePreviewContainer: {
    position: 'relative',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeEvidenceBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDock: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
