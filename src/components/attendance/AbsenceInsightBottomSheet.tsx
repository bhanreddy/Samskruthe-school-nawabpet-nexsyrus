import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

const { width: SW } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

export interface InsightStudentData {
  id: string;
  name: string;
  rollNo?: string;
  className?: string | null;
  photoUrl?: string | null;
  consecutiveAbsenceDays?: number;
  absenceStreakStartDate?: string | null;
  absenceStreakEndDate?: string | null;
  absenceStreakDates?: Array<{ date: string; status: string }>;
  monthlyAttendancePercentage?: number | null;
  absenceRiskLevel?: string | null;
  isIrregular?: boolean;
  monthlyAbsentCount?: number;
}

interface Props {
  visible: boolean;
  student: InsightStudentData | null;
  onClose: () => void;
  onViewHistory?: (studentId: string) => void;
}

const ACCENT = {
  rose: '#E11D48',
  roseBg: 'rgba(225,29,72,0.1)',
  roseBorder: 'rgba(225,29,72,0.25)',
  emerald: '#059669',
  emeraldBg: 'rgba(5,150,105,0.1)',
  emeraldBorder: 'rgba(5,150,105,0.25)',
  amber: '#D97706',
  indigo: '#4F46E5',
};

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export default function AbsenceInsightBottomSheet({
  visible,
  student,
  onClose,
  onViewHistory,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  if (!student) return null;

  const streakDays = student.consecutiveAbsenceDays || 0;
  const streakDates = student.absenceStreakDates || [];
  const monthlyPct =
    student.monthlyAttendancePercentage != null
      ? Math.round(student.monthlyAttendancePercentage)
      : null;

  const handleClose = () => {
    if (!IS_WEB) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  const handleViewHistory = () => {
    if (!IS_WEB) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onClose();
    if (onViewHistory) {
      onViewHistory(student.id);
    }
  };

  const formattedRange = useMemo(() => {
    if (!student.absenceStreakStartDate) return '';
    const startFormatted = formatDateLabel(student.absenceStreakStartDate);
    if (!student.absenceStreakEndDate || student.absenceStreakStartDate === student.absenceStreakEndDate) {
      return startFormatted;
    }
    const endFormatted = formatDateLabel(student.absenceStreakEndDate);
    return `${startFormatted} → ${endFormatted}`;
  }, [student.absenceStreakStartDate, student.absenceStreakEndDate]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconRing}>
                <Ionicons name="analytics-outline" size={18} color={ACCENT.rose} />
              </View>
              <Text style={styles.headerTitle}>Attendance Insight</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close insight modal"
            >
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Student Identity Card */}
            <View style={styles.identityCard}>
              {student.photoUrl ? (
                <Image
                  source={{ uri: student.photoUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <LinearGradient
                  colors={isDark ? ['#4338CA', '#6366F1'] : ['#6366F1', '#818CF8']}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}

              <View style={styles.identityInfo}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {student.name}
                </Text>
                <View style={styles.identityMetaRow}>
                  {student.className ? (
                    <Text style={styles.classLabel}>{student.className}</Text>
                  ) : null}
                  {student.rollNo ? (
                    <View style={styles.rollPill}>
                      <Text style={styles.rollText}>Roll {student.rollNo}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Streak Hero Banner */}
            <View style={styles.streakHero}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(225,29,72,0.22)', 'rgba(225,29,72,0.08)']
                    : ['rgba(254,226,226,0.8)', 'rgba(255,241,242,0.4)']
                }
                style={styles.streakGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.streakCountBadge}>
                  <Text style={styles.streakCountNumber}>{streakDays}</Text>
                </View>
                <View style={styles.streakInfoCol}>
                  <Text style={styles.streakHeading}>
                    {streakDays === 1 ? 'DAY ABSENT' : 'CONSECUTIVE DAYS ABSENT'}
                  </Text>
                  {formattedRange ? (
                    <View style={styles.rangeRow}>
                      <Ionicons name="calendar-outline" size={13} color={ACCENT.rose} />
                      <Text style={styles.rangeText}>{formattedRange}</Text>
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            </View>

            {/* Timeline Breakdown */}
            {streakDates.length > 0 && (
              <View style={styles.timelineSection}>
                <Text style={styles.sectionTitle}>Breakdown</Text>
                <View style={styles.timelineList}>
                  {streakDates.map((item, index) => {
                    const isLast = index === streakDates.length - 1;
                    return (
                      <View key={item.date} style={styles.timelineItem}>
                        <View style={styles.timelineNodeCol}>
                          <View style={styles.timelineDot}>
                            <View style={styles.timelineDotInner} />
                          </View>
                          {!isLast && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineDate}>{formatDateLabel(item.date)}</Text>
                          <View style={styles.statusBadge}>
                            <Ionicons name="close-circle" size={14} color={ACCENT.rose} />
                            <Text style={styles.statusBadgeText}>Absent</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Monthly Attendance Card */}
            {monthlyPct != null && (
              <View style={styles.metricCard}>
                <View style={styles.metricTop}>
                  <View style={styles.metricLabelRow}>
                    <Ionicons name="pie-chart-outline" size={16} color={ACCENT.indigo} />
                    <Text style={styles.metricTitle}>Monthly Attendance</Text>
                  </View>
                  <Text
                    style={[
                      styles.metricPct,
                      { color: monthlyPct >= 75 ? ACCENT.emerald : ACCENT.rose },
                    ]}
                  >
                    {monthlyPct}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, monthlyPct))}%`,
                        backgroundColor: monthlyPct >= 75 ? ACCENT.emerald : ACCENT.rose,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Irregular Flag Callout */}
            {student.isIrregular && (
              <View style={styles.irregularBanner}>
                <Ionicons name="alert-circle-outline" size={18} color={ACCENT.amber} />
                <Text style={styles.irregularText}>
                  Irregular attendance detected: absent {student.monthlyAbsentCount || 5}+ times this month.
                </Text>
              </View>
            )}

            {/* View Full History Button */}
            {onViewHistory && (
              <TouchableOpacity
                style={styles.historyBtn}
                activeOpacity={0.85}
                onPress={handleViewHistory}
                accessibilityRole="button"
                accessibilityLabel="View full attendance history"
              >
                <Ionicons name="time-outline" size={18} color="#fff" />
                <Text style={styles.historyBtnText}>View Full Attendance History</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    backdropTap: {
      flex: 1,
    },
    sheet: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      maxHeight: '85%',
      borderTopWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      ...(Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
        },
        android: { elevation: 12 },
        web: { boxShadow: '0 -8px 32px rgba(0,0,0,0.35)' } as object,
        default: {},
      })),
    },
    handleWrap: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerIconRing: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(225,29,72,0.18)' : '#FFF1F2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#0F172A',
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
    },
    scrollContent: {
      paddingVertical: 16,
      gap: 16,
    },
    identityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F6',
      gap: 14,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 22,
      fontWeight: '800',
      color: '#fff',
    },
    identityInfo: {
      flex: 1,
      gap: 4,
    },
    studentName: {
      fontSize: 17,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#0F172A',
      letterSpacing: -0.2,
    },
    identityMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    classLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    rollPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(79,70,229,0.18)' : 'rgba(79,70,229,0.1)',
    },
    rollText: {
      fontSize: 11,
      fontWeight: '700',
      color: ACCENT.indigo,
    },
    streakHero: {
      borderRadius: 20,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(225,29,72,0.3)' : '#FECDD3',
    },
    streakGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 16,
    },
    streakCountBadge: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: ACCENT.rose,
      justifyContent: 'center',
      alignItems: 'center',
      ...(Platform.select({
        ios: {
          shadowColor: ACCENT.rose,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        android: { elevation: 5 },
        web: { boxShadow: '0 6px 16px rgba(225,29,72,0.35)' } as object,
        default: {},
      })),
    },
    streakCountNumber: {
      fontSize: 28,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -1,
    },
    streakInfoCol: {
      flex: 1,
      gap: 4,
    },
    streakHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: ACCENT.rose,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    rangeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rangeText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#CBD5E1' : '#475569',
    },
    timelineSection: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#94A3B8' : '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    timelineList: {
      paddingHorizontal: 4,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      minHeight: 38,
    },
    timelineNodeCol: {
      width: 24,
      alignItems: 'center',
    },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: ACCENT.rose,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    timelineDotInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: ACCENT.rose,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: isDark ? 'rgba(225,29,72,0.3)' : '#FECDD3',
      marginVertical: 2,
    },
    timelineContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 12,
      paddingBottom: 10,
    },
    timelineDate: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#1E293B',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(225,29,72,0.15)' : '#FFF1F2',
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: ACCENT.rose,
    },
    metricCard: {
      padding: 14,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#EEF2F6',
      gap: 10,
    },
    metricTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    metricLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metricTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#E2E8F0' : '#334155',
    },
    metricPct: {
      fontSize: 18,
      fontWeight: '800',
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    irregularBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(217,119,6,0.16)' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(217,119,6,0.3)' : '#FDE68A',
    },
    irregularText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#FDE68A' : '#B45309',
      lineHeight: 18,
    },
    historyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: ACCENT.indigo,
      marginTop: 6,
      ...(Platform.select({
        ios: {
          shadowColor: ACCENT.indigo,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        android: { elevation: 4 },
        web: { boxShadow: '0 6px 16px rgba(79,70,229,0.35)' } as object,
        default: {},
      })),
    },
    historyBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#fff',
    },
  });
