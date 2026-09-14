import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import * as Haptics from '../../utils/haptics';
import { IntelligenceInsight } from '../../services/intelligenceService';

const { height: WIN_H } = Dimensions.get('window');

interface InsightExplanationModalProps {
  visible: boolean;
  insight: IntelligenceInsight | null;
  onClose: () => void;
  onCreateIntervention?: (insight: IntelligenceInsight) => void;
  onMarkReviewed?: (insight: IntelligenceInsight) => void;
  onDismiss?: (insight: IntelligenceInsight) => void;
}

export const InsightExplanationModal: React.FC<InsightExplanationModalProps> = ({
  visible,
  insight,
  onClose,
  onCreateIntervention,
  onMarkReviewed,
  onDismiss,
}) => {
  const { theme, isDark } = useTheme();

  if (!insight) return null;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'LEVEL_4_CRITICAL':
        return { label: 'Level 4 • Critical Attention', color: '#EF4444', bg: '#FEE2E2' };
      case 'LEVEL_3_ATTENTION':
        return { label: 'Level 3 • Attention Required', color: '#EA580C', bg: '#FFEDD5' };
      case 'LEVEL_2_WATCH':
        return { label: 'Level 2 • Watch', color: '#D97706', bg: '#FEF3C7' };
      case 'LEVEL_1_POSITIVE':
        return { label: 'Level 1 • Positive Growth', color: '#059669', bg: '#D1FAE5' };
      default:
        return { label: 'Level 0 • Informational', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case 'HIGH':
        return { label: 'High Confidence', color: '#10B981' };
      case 'MODERATE':
        return { label: 'Moderate Confidence', color: '#3B82F6' };
      default:
        return { label: 'Low Confidence', color: '#94A3B8' };
    }
  };

  const badge = getSeverityBadge(insight.severity || 'LEVEL_0_INFORMATIONAL');
  const confBadge = getConfidenceBadge(insight.confidence);
  const primaryColor = theme.colors.primary || '#6366F1';
  const cardStyle = clayCard(isDark, 'sm');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.badgePill, { backgroundColor: isDark ? `${badge.color}26` : badge.bg }]}>
                <Ionicons name="sparkles" size={14} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <View style={[styles.confPill, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Text style={[styles.confText, { color: confBadge.color }]}>{confBadge.label}</Text>
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
            {/* Title & Summary */}
            <Text style={[styles.title, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {insight.title}
            </Text>
            <Text style={[styles.summary, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {insight.summary}
            </Text>

            {/* Why was this generated? Section */}
            <View style={[cardStyle, styles.cardSection]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="help-circle-outline" size={18} color="#6366F1" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  Why was this generated?
                </Text>
              </View>

              {insight.explanation_bullets && insight.explanation_bullets.length > 0 ? (
                <View style={styles.bulletsList}>
                  {insight.explanation_bullets.map((point: string, idx: number) => (
                    <View key={idx} style={styles.bulletRow}>
                      <Ionicons name="ellipse" size={6} color="#6366F1" style={{ marginTop: 6 }} />
                      <Text style={[styles.bulletText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : Array.isArray(insight.bullet_points) && insight.bullet_points.length > 0 ? (
                <View style={styles.bulletsList}>
                  {insight.bullet_points.map((point: string, idx: number) => (
                    <View key={`b-${idx}`} style={styles.bulletRow}>
                      <Ionicons name="ellipse" size={6} color="#6366F1" style={{ marginTop: 6 }} />
                      <Text style={[styles.bulletText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                        {point}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyNote, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {insight.explanation_text || 'Observation and academic signals matched intelligence criteria.'}
                </Text>
              )}

              {/* Baseline Comparison If Present */}
              {insight.baseline_comparison ? (
                <View style={[styles.baselineBox, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                  <Text style={[styles.baselineTitle, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                    Historical Baseline Comparison
                  </Text>
                  <Text style={[styles.baselineText, { color: isDark ? '#E2E8F0' : '#312E81' }]}>
                    Attendance baseline: {insight.baseline_comparison.attendance_baseline ?? 'insufficient data'}%
                    {' • '}
                    Academic baseline: {insight.baseline_comparison.academic_baseline ?? 'insufficient data'}%
                  </Text>
                </View>
              ) : insight.baseline_context ? (
                <View style={[styles.baselineBox, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                  <Text style={[styles.baselineTitle, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                    Historical Baseline Comparison
                  </Text>
                  <Text style={[styles.baselineText, { color: isDark ? '#E2E8F0' : '#312E81' }]}>
                    {insight.baseline_context.summary ||
                      `Normal baseline: ${insight.baseline_context.mean || 'N/A'}% • Current: ${insight.baseline_context.current || 'N/A'}% (Deviation: ${insight.baseline_context.delta_pct || 'N/A'}%)`}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Supporting Signals List */}
            {insight.supporting_signals && insight.supporting_signals.length > 0 ? (
              <View style={[cardStyle, styles.cardSection]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="pulse-outline" size={18} color="#10B981" />
                  <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Supporting SchoolIMS Signals ({insight.supporting_signals.length})
                  </Text>
                </View>

                <View style={styles.signalsList}>
                  {insight.supporting_signals.map((sig: any, idx: number) => (
                    <View
                      key={sig.id || idx}
                      style={[styles.signalItem, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.signalTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                          {sig.signal_type || sig.category}
                        </Text>
                        <Text style={[styles.signalSummary, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                          {sig.summary || sig.description}
                        </Text>
                      </View>
                      <View style={styles.signalBadge}>
                        <Text style={[styles.signalBadgeText, { color: primaryColor }]}>
                          {sig.severity || 'SIGNAL'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Rule Reference (Deterministic Auditing) */}
            <View style={[cardStyle, styles.cardSection]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                  Deterministic Rule Reference
                </Text>
              </View>
              <Text style={[styles.ruleCode, { color: isDark ? '#C7D2FE' : '#4F46E5' }]}>
                {insight.rule_code || 'SCHOOLIMS_PATTERN_ENGINE_V1'}
              </Text>
              <Text style={[styles.ruleDescription, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                This insight was triggered deterministically by SchoolIMS rules based on real attendance, homework, exam marks, and teacher observations. No black-box or unsupported predictions were used.
              </Text>
            </View>

            {/* Recommended Actions */}
            {(insight.recommended_actions && insight.recommended_actions.length > 0) ||
            (insight.recommendations && insight.recommendations.length > 0) ? (
              <View style={[cardStyle, styles.cardSection]}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="checkbox-outline" size={18} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Recommended Staff Actions
                  </Text>
                </View>
                <View style={styles.actionsList}>
                  {(insight.recommended_actions || insight.recommendations || []).map((act: any, idx: number) => {
                    const actionLabel = typeof act === 'string' ? act : act.label || act.title || 'Staff action';
                    return (
                      <View key={idx} style={styles.actionItem}>
                        <Ionicons name="arrow-forward-circle-outline" size={16} color="#F59E0B" />
                        <Text style={[styles.actionText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                          {actionLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.footer, { borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            {onCreateIntervention && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onCreateIntervention(insight);
                }}
                style={styles.primaryActionBtn}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryActionGradient}
                >
                  <Ionicons name="git-network-outline" size={18} color="#FFF" />
                  <Text style={styles.primaryActionText}>Create Intervention Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.secondaryActionsRow}>
              {onMarkReviewed && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onMarkReviewed(insight);
                  }}
                  style={[styles.secondaryBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <Ionicons name="checkmark-outline" size={16} color={isDark ? '#E2E8F0' : '#475569'} />
                  <Text style={[styles.secondaryBtnText, { color: isDark ? '#E2E8F0' : '#475569' }]}>
                    Mark Reviewed
                  </Text>
                </TouchableOpacity>
              )}

              {onDismiss && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onDismiss(insight);
                  }}
                  style={[styles.secondaryBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <Ionicons name="eye-off-outline" size={16} color="#EF4444" />
                  <Text style={[styles.secondaryBtnText, { color: '#EF4444' }]}>Dismiss</Text>
                </TouchableOpacity>
              )}
            </View>
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
    maxHeight: WIN_H * 0.92,
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
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardSection: {
    padding: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bulletsList: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  emptyNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  baselineBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
  },
  baselineTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  baselineText: {
    fontSize: 12,
    lineHeight: 16,
  },
  signalsList: {
    marginTop: 4,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  signalTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  signalSummary: {
    fontSize: 12,
    marginTop: 2,
  },
  signalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  signalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ruleCode: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
