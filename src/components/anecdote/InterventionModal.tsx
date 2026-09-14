import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import * as Haptics from '../../utils/haptics';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { InterventionService, StudentIntervention } from '../../services/intelligenceService';

const { height: WIN_H } = Dimensions.get('window');

const ACTION_TYPES = [
  { key: 'TEACHER_REVIEW', label: 'Teacher Review', icon: 'person-outline' },
  { key: 'ADDITIONAL_PRACTICE', label: 'Additional Practice', icon: 'create-outline' },
  { key: 'PARENT_COMMUNICATION', label: 'Parent Communication', icon: 'chatbubbles-outline' },
  { key: 'COUNSELING_SUPPORT', label: 'Counseling Support', icon: 'heart-outline' },
  { key: 'PEER_MENTORSHIP', label: 'Peer Mentorship', icon: 'people-outline' },
  { key: 'BEHAVIOURAL_CONTRACT', label: 'Conduct Plan', icon: 'clipboard-outline' },
];

const OUTCOME_OPTIONS = [
  { key: 'EFFECTIVE', label: 'Effective (Improvement Observed)', color: '#10B981' },
  { key: 'PARTIALLY_EFFECTIVE', label: 'Partially Effective', color: '#3B82F6' },
  { key: 'NO_CHANGE', label: 'No Measurable Change', color: '#F59E0B' },
  { key: 'ESCALATE', label: 'Escalate to Coordinator', color: '#EF4444' },
];

interface InterventionModalProps {
  visible: boolean;
  studentId: string;
  studentName?: string;
  existingIntervention?: StudentIntervention | null;
  insightId?: string;
  onClose: () => void;
  onSuccess?: (intervention: StudentIntervention) => void;
}

export const InterventionModal: React.FC<InterventionModalProps> = ({
  visible,
  studentId,
  studentName = 'Student',
  existingIntervention,
  insightId,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();

  // Mode: Create new or record outcome
  const isOutcomeMode = Boolean(existingIntervention && existingIntervention.status !== 'COMPLETED');

  // Form states
  const [actionType, setActionType] = useState('TEACHER_REVIEW');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDateDays, setTargetDateDays] = useState(14);

  // Outcome states
  const [outcomeRating, setOutcomeRating] = useState('EFFECTIVE');
  const [outcomeMetricBefore, setOutcomeMetricBefore] = useState('');
  const [outcomeMetricAfter, setOutcomeMetricAfter] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingIntervention) {
      setActionType(existingIntervention.action_type || 'TEACHER_REVIEW');
      setTitle(existingIntervention.title || '');
      setDescription(existingIntervention.description || '');
      if (existingIntervention.outcome_notes) {
        setOutcomeNotes(existingIntervention.outcome_notes);
      }
    } else {
      setTitle('');
      setDescription('');
      setActionType('TEACHER_REVIEW');
      setTargetDateDays(14);
      setOutcomeMetricBefore('');
      setOutcomeMetricAfter('');
      setOutcomeNotes('');
    }
  }, [existingIntervention, visible]);

  const handleSubmit = async () => {
    if (!isOutcomeMode && !description.trim()) {
      alertCompat('Details Required', 'Please enter a brief description for this intervention strategy.');
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (isOutcomeMode && existingIntervention) {
        // Record outcome
        const updated = await InterventionService.recordOutcome(existingIntervention.id, {
          outcome_rating: outcomeRating,
          outcome_notes: outcomeNotes.trim() || 'Improvement observed following intervention.',
          metrics_before: outcomeMetricBefore ? { value: outcomeMetricBefore } : undefined,
          metrics_after: outcomeMetricAfter ? { value: outcomeMetricAfter } : undefined,
          status: 'COMPLETED',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alertCompat('Outcome Saved', 'Intervention outcome recorded successfully.');
        if (onSuccess) onSuccess(updated);
      } else {
        // Create new intervention
        const targetDate = new Date(Date.now() + targetDateDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const followUpDate = new Date(Date.now() + Math.floor(targetDateDays / 2) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        const created = await InterventionService.createIntervention({
          student_id: studentId,
          insight_id: insightId,
          action_type: actionType,
          title: title.trim() || `${actionType.replace(/_/g, ' ')} Strategy`,
          description: description.trim(),
          target_date: targetDate,
          follow_up_date: followUpDate,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alertCompat('Intervention Created', 'Staff intervention plan active.');
        if (onSuccess) onSuccess(created);
      }

      onClose();
    } catch (err: any) {
      alertCompat('Error', err?.message || 'Failed to save intervention');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'sm');
  const insetStyle = clayInset(isDark, false);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.headerBadge}>
                <Ionicons name="git-network-outline" size={18} color="#FFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  {isOutcomeMode ? 'Record Intervention Outcome' : 'Create Intervention Plan'}
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Student: {studentName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {isOutcomeMode ? (
              /* Outcome Recording Form */
              <>
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    OUTCOME ASSESSMENT
                  </Text>
                  <View style={styles.outcomeOptions}>
                    {OUTCOME_OPTIONS.map((opt) => {
                      const active = outcomeRating === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => {
                            setOutcomeRating(opt.key);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.outcomeBtn,
                            {
                              backgroundColor: active ? opt.color : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? opt.color : isDark ? '#334155' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Ionicons
                            name={active ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={active ? '#FFF' : opt.color}
                          />
                          <Text
                            style={[
                              styles.outcomeBtnText,
                              { color: active ? '#FFF' : isDark ? '#F1F5F9' : '#0F172A' },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Before vs After Metrics */}
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    MEASURABLE METRICS (BEFORE VS AFTER)
                  </Text>
                  <View style={styles.metricRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metricSublabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        Before (e.g. 52% homework)
                      </Text>
                      <TextInput
                        style={[insetStyle, styles.metricInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        placeholder="52%"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={outcomeMetricBefore}
                        onChangeText={setOutcomeMetricBefore}
                      />
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#10B981"
                      style={{ marginHorizontal: 12, marginTop: 24 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.metricSublabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                        After (e.g. 78% homework)
                      </Text>
                      <TextInput
                        style={[insetStyle, styles.metricInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                        placeholder="78%"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={outcomeMetricAfter}
                        onChangeText={setOutcomeMetricAfter}
                      />
                    </View>
                  </View>
                </View>

                {/* Notes */}
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    OUTCOME NOTES
                  </Text>
                  <TextInput
                    style={[insetStyle, styles.textArea, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="e.g. Improvement observed following the intervention. Student completed 9 out of 10 homework assignments."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    multiline
                    numberOfLines={3}
                    value={outcomeNotes}
                    onChangeText={setOutcomeNotes}
                  />
                </View>
              </>
            ) : (
              /* Create New Intervention Form */
              <>
                {/* Action Type */}
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    INTERVENTION ACTION TYPE
                  </Text>
                  <View style={styles.actionGrid}>
                    {ACTION_TYPES.map((act) => {
                      const active = actionType === act.key;
                      return (
                        <TouchableOpacity
                          key={act.key}
                          onPress={() => {
                            setActionType(act.key);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.actionGridItem,
                            {
                              backgroundColor: active ? primaryColor : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? primaryColor : isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                        >
                          <Ionicons
                            name={act.icon as any}
                            size={16}
                            color={active ? '#FFF' : isDark ? '#94A3B8' : '#64748B'}
                          />
                          <Text
                            style={[
                              styles.actionGridText,
                              { color: active ? '#FFF' : isDark ? '#E2E8F0' : '#475569' },
                            ]}
                          >
                            {act.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Plan Title & Strategy Description */}
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    STRATEGY DESCRIPTION
                  </Text>
                  <TextInput
                    style={[insetStyle, styles.textArea, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                    placeholder="e.g. Schedule weekly 15-minute concept review with teacher; coordinate with parents to review completed homework notebook."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* Review Target Window */}
                <View style={[cardStyle, styles.sectionCard]}>
                  <Text style={[styles.label, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    TARGET EVALUATION TIMELINE
                  </Text>
                  <View style={styles.timelineTabs}>
                    {[7, 14, 28, 60].map((days) => {
                      const active = targetDateDays === days;
                      return (
                        <TouchableOpacity
                          key={days}
                          onPress={() => {
                            setTargetDateDays(days);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.timelinePill,
                            {
                              backgroundColor: active ? primaryColor : isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: active ? primaryColor : isDark ? '#334155' : '#CBD5E1',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timelinePillText,
                              { color: active ? '#FFF' : isDark ? '#94A3B8' : '#64748B' },
                            ]}
                          >
                            {days} Days
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitBtn, { opacity: isSubmitting ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>
                      {isOutcomeMode ? 'Record Outcome' : 'Confirm & Start Intervention'}
                    </Text>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: WIN_H * 0.9,
    minHeight: WIN_H * 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  outcomeOptions: {
    gap: 8,
  },
  outcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  outcomeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricSublabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionGridText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  timelinePill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  timelinePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
