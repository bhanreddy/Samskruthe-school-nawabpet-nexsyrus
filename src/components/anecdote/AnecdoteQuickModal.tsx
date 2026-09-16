import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Pressable,
  Image,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import * as Haptics from '../../utils/haptics';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { StudentService } from '../../services/studentService';
import { TeacherService } from '../../services/commonServices';
import { AnecdoteService, InferredAnecdote, ObservationCategory } from '../../services/anecdoteService';
import { AnecdoteOfflineQueue, newAnecdoteClientId } from '../../services/anecdoteOfflineQueue';
import StudentPhoto from '../StudentPhoto';
import {
  ANECDOTE_CONTEXTS,
  ANECDOTE_TYPES,
  ANECDOTE_SEVERITIES,
  OBSERVATION_PROMPTS,
  mapStudentOption,
  normalizeContext,
  typeMeta,
} from '../../features/anecdote/anecdoteUi';

const RECENT_STUDENTS_KEY = '@schoolims_anecdote_recent_students';

export interface StudentOption {
  id: string;
  display_name: string;
  admission_no?: string;
  photo_url?: string | null;
  class_name?: string;
}

export interface AnecdoteDraft {
  text?: string;
  observationType?: string;
}

interface AnecdoteQuickModalProps {
  visible: boolean;
  preselectedStudent?: StudentOption | null;
  initialDraft?: AnecdoteDraft | null;
  onClose: () => void;
  onSuccess?: (anecdote: any, student?: StudentOption | null) => void;
}

export const AnecdoteQuickModal: React.FC<AnecdoteQuickModalProps> = ({
  visible,
  preselectedStudent,
  initialDraft,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const isWide = winW >= 720;

  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(preselectedStudent || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentOption[]>([]);
  const [recentStudents, setRecentStudents] = useState<StudentOption[]>([]);
  const [classStudents, setClassStudents] = useState<StudentOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTried, setSearchTried] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(!preselectedStudent);

  const [observation, setObservation] = useState('');
  const [context, setContext] = useState('classroom');
  const [observationType, setObservationType] = useState('OBSERVATION');
  const [severity, setSeverity] = useState('LEVEL_0_INFORMATIONAL');
  const [selectedCategory, setSelectedCategory] = useState<ObservationCategory | null>(null);
  const [categories, setCategories] = useState<ObservationCategory[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [isInferring, setIsInferring] = useState(false);
  const [hasUserCustomized, setHasUserCustomized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inferConfidence, setInferConfidence] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }

    loadTaxonomy();
    loadRecentStudents();
    loadMyClassStudents();

    if (preselectedStudent) {
      setSelectedStudent(preselectedStudent);
      setShowStudentPicker(false);
    } else {
      setShowStudentPicker(true);
    }

    if (initialDraft?.text) setObservation(initialDraft.text);
    if (initialDraft?.observationType) setObservationType(initialDraft.observationType);
  }, [visible, preselectedStudent, initialDraft]);

  const loadTaxonomy = async () => {
    try {
      const data = await AnecdoteService.getTaxonomy();
      setCategories(data?.categories || []);
    } catch {
      setCategories([]);
    }
  };

  const loadRecentStudents = async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_STUDENTS_KEY);
      if (raw) setRecentStudents(JSON.parse(raw));
    } catch {
      // Ignore storage error
    }
  };

  const loadMyClassStudents = async () => {
    try {
      const classes = await TeacherService.getMyClasses();
      const first = classes?.[0];
      if (!first?.class_id || !first?.section_id) return;
      const page = await StudentService.getAll({
        class_id: first.class_id,
        section_id: first.section_id,
        limit: 8,
        sort_by: 'name',
        sort_order: 'asc',
      } as any);
      const rows = Array.isArray(page) ? page : page?.data || [];
      setClassStudents(rows.map(mapStudentOption).filter((s) => s.id));
    } catch {
      setClassStudents([]);
    }
  };

  const saveRecentStudent = async (student: StudentOption) => {
    try {
      const updated = [student, ...recentStudents.filter((s) => s.id !== student.id)].slice(0, 6);
      setRecentStudents(updated);
      await AsyncStorage.setItem(RECENT_STUDENTS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  };

  const resetForm = () => {
    setObservation('');
    setContext('classroom');
    setObservationType('OBSERVATION');
    setSeverity('LEVEL_0_INFORMATIONAL');
    setSelectedCategory(null);
    setSkills([]);
    setEvidenceUri(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchTried(false);
    setHasUserCustomized(false);
    setIsSubmitting(false);
    setShowDetails(false);
    setInferConfidence(null);
    setSelectedStudent(null);
    setShowStudentPicker(true);
  };

  useEffect(() => {
    if (!visible) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchTried(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchTried(true);
      try {
        const results = await StudentService.search(q, 8);
        setSearchResults((results || []).map(mapStudentOption));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, visible]);

  useEffect(() => {
    if (!visible || observation.trim().length < 8 || hasUserCustomized) return;

    const timer = setTimeout(async () => {
      setIsInferring(true);
      try {
        const inferred: InferredAnecdote = await AnecdoteService.inferAnecdote(observation);
        if (inferred && !hasUserCustomized) {
          if (inferred.observation_type) setObservationType(inferred.observation_type);
          if (inferred.context) setContext(normalizeContext(inferred.context));
          if (inferred.severity) setSeverity(inferred.severity);
          if (inferred.skills && Array.isArray(inferred.skills)) setSkills(inferred.skills);
          if (inferred.suggested_skills && Array.isArray(inferred.suggested_skills)) {
            setSkills(inferred.suggested_skills);
          }
          setInferConfidence(inferred.confidence || null);
          if (inferred.category_code && categories.length > 0) {
            const matched = categories.find((c) => c.code === inferred.category_code);
            if (matched) setSelectedCategory(matched);
          }
        }
      } catch {
        // Skip inference quietly
      } finally {
        setIsInferring(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [observation, hasUserCustomized, categories, visible]);

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
      alertCompat('Could not add photo', 'Please check photo permissions and try again.');
    }
  };

  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setShowStudentPicker(false);
    setSearchQuery('');
    saveRecentStudent(student);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSave = Boolean(selectedStudent && observation.trim().length >= 8 && !isSubmitting);
  const saveHint = !selectedStudent
    ? 'Pick a student first'
    : observation.trim().length < 8
    ? 'Write a short note (at least 8 characters)'
    : 'Ready to save';

  const handleSubmit = async () => {
    if (!selectedStudent) {
      setShowStudentPicker(true);
      alertCompat('Who is this about?', 'Search and tap a student before saving.');
      return;
    }
    if (observation.trim().length < 8) {
      alertCompat('Add a little more', 'A short sentence is enough — what did you notice?');
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
      context: normalizeContext(context),
      severity,
      tags: skills,
      visibility: 'STAFF_ONLY',
      observed_at: new Date().toISOString(),
    };

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const created = await AnecdoteService.createAnecdote(payload);

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
          // Evidence is optional
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: 'success',
        text1: 'Observation saved',
        text2: `${selectedStudent.display_name} · ${typeMeta(observationType).label}`,
      });
      onSuccess?.(created, selectedStudent);
      onClose();
    } catch {
      try {
        await AnecdoteOfflineQueue.enqueueObservation({
          ...payload,
          client_generated_id: clientId,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Toast.show({
          type: 'info',
          text1: 'Saved on this device',
          text2: 'It will sync automatically when you are back online.',
        });
        onSuccess?.({ id: clientId, is_offline: true, ...payload }, selectedStudent);
        onClose();
      } catch {
        alertCompat('Could not save', 'Please check your connection and try once more.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestClose = () => {
    if (observation.trim() || selectedStudent) {
      alertCompat('Discard this observation?', 'Your note will not be saved.', [
        { text: 'Keep writing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'md');
  const insetStyle = clayInset(isDark, false);
  const sheetWidth = isWide ? Math.min(560, winW - 32) : winW;

  const suggestedStudents = useMemo(() => {
    const seen = new Set<string>();
    const merged: StudentOption[] = [];
    for (const student of [...recentStudents, ...classStudents]) {
      if (!student?.id || seen.has(student.id)) continue;
      seen.add(student.id);
      merged.push(student);
    }
    return merged.slice(0, 8);
  }, [recentStudents, classStudents]);

  return (
    <Modal visible={visible} animationType={isWide ? 'fade' : 'slide'} transparent onRequestClose={requestClose}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.modalBackdrop, isWide && styles.modalBackdropWide]} onPress={requestClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                width: sheetWidth,
                maxHeight: winH * (isWide ? 0.9 : 0.94),
                minHeight: winH * (isWide ? 0.62 : 0.78),
                borderRadius: isWide ? 28 : undefined,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                alignSelf: 'center',
              },
            ]}
          >
            <View style={styles.grabberWrap}>
              <View style={[styles.grabber, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
            </View>

            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.headerIconBadge}>
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Record a moment
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {selectedStudent ? `About ${selectedStudent.display_name}` : 'Takes about 20 seconds'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={requestClose} style={styles.closeButton} hitSlop={12}>
                <Ionicons name="close" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[cardStyle, styles.sectionCard]}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  1. WHO DID YOU NOTICE?
                </Text>
                {selectedStudent && !showStudentPicker ? (
                  <View style={styles.selectedStudentRow}>
                    <View style={styles.studentInfo}>
                      <StudentPhoto
                        photoUrl={selectedStudent.photo_url}
                        displayName={selectedStudent.display_name}
                        size={46}
                      />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[styles.studentName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                          {selectedStudent.display_name}
                        </Text>
                        <Text style={[styles.studentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {[
                            selectedStudent.class_name,
                            selectedStudent.admission_no ? `Adm ${selectedStudent.admission_no}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Student'}
                        </Text>
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
                  <>
                    <View style={[styles.pickerSearchHeader, insetStyle]}>
                      <Ionicons name="search-outline" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                      <TextInput
                        style={[styles.pickerSearchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        placeholder="Type a name or admission number"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus={!selectedStudent && Platform.OS === 'web'}
                        autoCorrect={false}
                      />
                      {isSearching ? <ActivityIndicator size="small" color={primaryColor} /> : null}
                    </View>

                    {searchResults.length > 0 ? (
                      <View style={styles.resultsList}>
                        {searchResults.map((st) => (
                          <TouchableOpacity
                            key={st.id}
                            style={styles.pickerStudentItem}
                            onPress={() => handleSelectStudent(st)}
                          >
                            <StudentPhoto photoUrl={st.photo_url} displayName={st.display_name} size={36} />
                            <View style={{ marginLeft: 10, flex: 1 }}>
                              <Text style={[styles.pickerStudentName, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                                {st.display_name}
                              </Text>
                              <Text style={[styles.pickerStudentMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                                {[st.class_name, st.admission_no ? `Adm ${st.admission_no}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : '#CBD5E1'} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : searchTried && !isSearching ? (
                      <Text style={[styles.emptySearch, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        No student matched “{searchQuery.trim()}”. Try the first name or admission number.
                      </Text>
                    ) : suggestedStudents.length > 0 ? (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.recentHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                          {recentStudents.length ? 'RECENT & YOUR CLASS' : 'YOUR CLASS'}
                        </Text>
                        <View style={styles.recentChipsRow}>
                          {suggestedStudents.map((st) => (
                            <TouchableOpacity
                              key={st.id}
                              style={[styles.recentChip, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                              onPress={() => handleSelectStudent(st)}
                            >
                              <StudentPhoto photoUrl={st.photo_url} displayName={st.display_name} size={22} />
                              <Text style={[styles.recentChipText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                                {st.display_name.split(' ')[0]}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.emptySearch, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        Start typing to find a student. Recent names will appear here next time.
                      </Text>
                    )}
                  </>
                )}
              </View>

              <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B', marginBottom: 0 }]}>
                    2. WHAT DID YOU NOTICE?
                  </Text>
                  {isInferring ? (
                    <View style={styles.inferringPill}>
                      <ActivityIndicator size="small" color="#8B5CF6" style={{ transform: [{ scale: 0.7 }] }} />
                      <Text style={styles.inferringText}>Tagging…</Text>
                    </View>
                  ) : (
                    <Text style={[styles.charCount, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                      {observation.trim().length}/400
                    </Text>
                  )}
                </View>
                <TextInput
                  style={[insetStyle, styles.observationInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                  placeholder="e.g. Asha explained the sum to two classmates without being asked."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  multiline
                  maxLength={400}
                  value={observation}
                  onChangeText={setObservation}
                />

                {!observation.trim() ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptScroll}>
                    {OBSERVATION_PROMPTS.map((prompt) => (
                      <TouchableOpacity
                        key={prompt.id}
                        onPress={() => {
                          setObservation(prompt.text);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[styles.promptChip, { borderColor: `${prompt.color}55`, backgroundColor: `${prompt.color}14` }]}
                      >
                        <Ionicons name={prompt.icon} size={14} color={prompt.color} />
                        <Text style={[styles.promptChipText, { color: prompt.color }]}>{prompt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}

                {(selectedCategory || observationType) && observation.trim().length >= 8 ? (
                  <View style={[styles.inferredBanner, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
                    <Ionicons name="bulb-outline" size={16} color="#6366F1" />
                    <Text style={[styles.inferredBannerText, { color: isDark ? '#C7D2FE' : '#4338CA' }]}>
                      We’ll file this as {selectedCategory?.name || 'an observation'} · {typeMeta(observationType).label}
                      {inferConfidence === 'HIGH' ? ' · confident match' : ''}
                    </Text>
                  </View>
                ) : null}
              </View>

              {categories.length > 0 ? (
                <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
                  <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => {
                      const active = selectedCategory?.id === cat.id;
                      const color = cat.color || primaryColor;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => {
                            setSelectedCategory(cat);
                            setHasUserCustomized(true);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.chipButton,
                            {
                              backgroundColor: active ? color : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? color : isDark ? '#334155' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Ionicons
                            name={(cat.icon as any) || 'pricetag-outline'}
                            size={14}
                            color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'}
                          />
                          <Text style={[styles.chipButtonText, { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' }]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => setShowDetails((v) => !v)}
                style={styles.detailsToggle}
              >
                <Text style={[styles.detailsToggleText, { color: primaryColor }]}>
                  {showDetails ? 'Hide type, place & signal' : 'Adjust type, place & signal'}
                </Text>
                <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} color={primaryColor} />
              </TouchableOpacity>

              {showDetails ? (
                <View style={[cardStyle, styles.sectionCard, { marginTop: 4 }]}>
                  <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>TYPE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {ANECDOTE_TYPES.map((item) => {
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
                              backgroundColor: active ? item.color : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? item.color : isDark ? '#334155' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Ionicons name={item.icon as any} size={14} color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'} />
                          <Text style={[styles.chipButtonText, { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' }]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 14 }]}>
                    WHERE
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {ANECDOTE_CONTEXTS.map((ctx) => {
                      const active = context === ctx.key;
                      return (
                        <TouchableOpacity
                          key={ctx.key}
                          onPress={() => {
                            setContext(ctx.key);
                            setHasUserCustomized(true);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.chipButton,
                            {
                              backgroundColor: active ? primaryColor : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? primaryColor : isDark ? '#334155' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Ionicons name={ctx.icon as any} size={14} color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'} />
                          <Text style={[styles.chipButtonText, { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' }]}>
                            {ctx.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 14 }]}>
                    SIGNAL
                  </Text>
                  <View style={styles.severityGrid}>
                    {ANECDOTE_SEVERITIES.map((item) => {
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
                          <Text style={[styles.severityText, { color: active ? '#FFF' : isDark ? '#94A3B8' : '#64748B' }]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.severityHint, { color: active ? 'rgba(255,255,255,0.85)' : isDark ? '#64748B' : '#94A3B8' }]}>
                            {item.hint}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={[cardStyle, styles.sectionCard, { marginTop: 14 }]}>
                <Text style={[styles.sectionLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>PHOTO (OPTIONAL)</Text>
                {evidenceUri ? (
                  <View style={styles.evidencePreviewContainer}>
                    <Image source={{ uri: evidenceUri }} style={styles.evidenceImage} />
                    <TouchableOpacity onPress={() => setEvidenceUri(null)} style={styles.removeEvidenceBtn}>
                      <Ionicons name="trash-outline" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handlePickEvidence} style={[styles.evidenceUploadBtn, insetStyle]}>
                    <Ionicons name="camera-outline" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text style={[styles.evidenceUploadText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                      Add a photo of the work or moment
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ height: 12 }} />
            </ScrollView>

            <View style={[styles.footerDock, { borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <Text style={[styles.saveHint, { color: canSave ? '#059669' : isDark ? '#94A3B8' : '#64748B' }]}>
                {saveHint}
              </Text>
              <TouchableOpacity onPress={handleSubmit} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.55 }}>
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
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.saveButtonText}>Save observation</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 24 : 0,
  },
  modalSheet: {
    overflow: 'hidden',
    maxWidth: '100%',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
  },
  grabber: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  closeButton: { padding: 6 },
  modalBackdropWide: {
    justifyContent: 'center',
    paddingVertical: 24,
  },
  scrollBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionCard: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  selectedStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700' },
  studentMeta: { fontSize: 12, marginTop: 2 },
  changeStudentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeStudentText: { fontSize: 12, fontWeight: '700' },
  pickerSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, paddingVertical: 2, outlineStyle: 'none' } as any,
  resultsList: { marginTop: 8 },
  pickerStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  pickerStudentName: { fontSize: 14, fontWeight: '600' },
  pickerStudentMeta: { fontSize: 12, marginTop: 2 },
  emptySearch: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  recentHeading: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  recentChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recentChipText: { fontSize: 12, fontWeight: '600' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inferringPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inferringText: { fontSize: 11, color: '#8B5CF6', fontWeight: '700' },
  charCount: { fontSize: 11, fontWeight: '600' },
  observationInput: {
    minHeight: 96,
    padding: 12,
    borderRadius: 14,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  promptScroll: { marginTop: 10, marginHorizontal: -2 },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  promptChipText: { fontSize: 12, fontWeight: '700' },
  inferredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inferredBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  detailsToggleText: { fontSize: 13, fontWeight: '700' },
  chipsScroll: { marginHorizontal: -4 },
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
  chipButtonText: { fontSize: 13, fontWeight: '600' },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 96,
  },
  severityText: { fontSize: 12, fontWeight: '800' },
  severityHint: { fontSize: 10, marginTop: 2, fontWeight: '500' },
  evidenceUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  evidenceUploadText: { fontSize: 13, fontWeight: '500' },
  evidencePreviewContainer: { position: 'relative', height: 140, borderRadius: 12, overflow: 'hidden' },
  evidenceImage: { width: '100%', height: '100%', resizeMode: 'cover' },
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 16 : 20,
    borderTopWidth: 1,
  },
  saveHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
