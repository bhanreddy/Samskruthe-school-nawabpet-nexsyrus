import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Linking, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { clayCard } from '../../theme/clayStyles';
import { CalendarEvent, calendarService } from '../../services/calendarService';
import { PRIORITY_CONFIG, formatEventDateRange, formatEventTime, getEventTypeConfig } from './CalendarTheme';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  isAdmin?: boolean;
  onEditEvent?: (event: CalendarEvent) => void;
  onEventUpdated?: () => void;
}

export const EventDetailModal: React.FC<Props> = ({
  visible,
  event,
  onClose,
  isAdmin = false,
  onEditEvent,
  onEventUpdated,
}) => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('te') ? 'te-IN' : 'en-IN';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 640;
  const styles = React.useMemo(() => getStyles(theme, isDark, compact), [theme, isDark, compact]);

  if (!event) return null;

  const typeConfig = getEventTypeConfig(event.event_type);
  const typeLabel = t(`studentCalendar.eventType.${event.event_type || 'SCHOOL_EVENT'}`, typeConfig.label);
  const priorityConfig = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.NORMAL;
  const dateStr = formatEventDateRange(event.start_date, event.end_date, event.all_day ?? event.is_all_day, event.start_time, event.end_time, locale);
  const allDay = event.all_day ?? event.is_all_day ?? true;
  const timeStr = allDay
    ? t('studentCalendar.allDay')
    : !event.start_time
      ? t('studentCalendar.scheduleTbd')
      : formatEventTime(false, event.start_time, event.end_time);
  const displayTitle = locale.startsWith('te') && event.title_te ? event.title_te : event.title;

  const handlePublish = async () => {
    try {
      await calendarService.publishEvent(event.id);
      alertCompat('Success', 'Event published to all targeted audiences');
      if (onEventUpdated) onEventUpdated();
      onClose();
    } catch (err: any) {
      alertCompat('Error', err.message || 'Failed to publish event');
    }
  };

  const handleCancel = () => {
    alertCompat(
      'Cancel Event',
      'Are you sure you want to cancel this event? Parents and staff will be notified.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarService.cancelEvent(event.id, 'Cancelled by administrator');
              alertCompat('Event Cancelled', 'The event has been cancelled.');
              if (onEventUpdated) onEventUpdated();
              onClose();
            } catch (err: any) {
              alertCompat('Error', err.message || 'Failed to cancel event');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    alertCompat(
      'Delete Event',
      'Are you sure you want to permanently remove this event from the calendar?',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await calendarService.deleteEvent(event.id);
              alertCompat('Deleted', 'Event removed.');
              if (onEventUpdated) onEventUpdated();
              onClose();
            } catch (err: any) {
              alertCompat('Error', err.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handleSyncToDevice = () => {
    const icsUrl = calendarService.getEventIcsUrl(event.id);
    if (Platform.OS === 'web') {
      window.open(icsUrl, '_blank');
    } else {
      Linking.openURL(icsUrl).catch(() => {
        alertCompat('Download', 'Could not open calendar URL');
      });
    }
  };

  const handleModuleDeepLink = () => {
    if (event.source_module === 'EXAM') {
      router.push('/admin/exams' as any);
      onClose();
    } else if (event.source_module === 'FEES') {
      router.push('/admin/fees/set-class-fee' as any);
      onClose();
    } else if (event.source_module === 'HOMEWORK') {
      router.push('/admin/diary/viewer' as any);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, compact && { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {compact ? <View style={styles.grabber} /> : null}
          <View style={styles.topBar}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isDark ? typeConfig.bgDark : typeConfig.bgLight,
                    borderColor: isDark ? typeConfig.borderDark : typeConfig.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name={typeConfig.icon as any}
                  size={14}
                  color={typeConfig.color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.typePillText, { color: typeConfig.color }]}>
                  {typeLabel}
                </Text>
              </View>

              <View
                style={[
                  styles.priorityPill,
                  { backgroundColor: priorityConfig.badge },
                ]}
              >
                <Text style={[styles.priorityPillText, { color: priorityConfig.color }]}>
                  {t(`studentCalendar.priority.${event.priority || 'NORMAL'}`, priorityConfig.label)}
                </Text>
              </View>

              {event.status === 'DRAFT' && (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftBadgeText}>Draft</Text>
                </View>
              )}

              {event.status === 'CANCELLED' && (
                <View style={styles.cancelledBadge}>
                  <Text style={styles.cancelledBadgeText}>{t('studentEventDesk.cancelled')}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Titles */}
            <Text style={styles.title}>{displayTitle}</Text>
            {event.title_te && event.title && event.title_te !== event.title ? (
              <Text style={styles.titleTelugu}>
                {displayTitle === event.title_te ? event.title : event.title_te}
              </Text>
            ) : null}

            {/* Date & Time Block */}
            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('studentCalendar.date')}</Text>
                  <Text style={styles.infoValue}>{dateStr}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="time-outline" size={16} color="#4F46E5" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('studentCalendar.time')}</Text>
                  <Text style={styles.infoValue}>{timeStr}</Text>
                </View>
              </View>

              {event.location ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <Ionicons name="location-outline" size={16} color="#4F46E5" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{t('studentCalendar.location')}</Text>
                    <Text style={styles.infoValue}>{event.location}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Description */}
            {event.description ? (
              <View style={styles.descSection}>
                <Text style={styles.sectionLabel}>{t('studentCalendar.details')}</Text>
                <Text style={styles.descText}>{event.description}</Text>
                {event.description_te ? (
                  <Text style={styles.descTextTelugu}>{event.description_te}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Operational Impacts */}
            {(event.is_holiday || event.timetable_day_override) && (
              <View style={styles.impactCard}>
                <Text style={styles.impactTitle}>Operational Impact</Text>
                {event.is_holiday && (
                  <View style={styles.impactItem}>
                    <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                    <Text style={styles.impactText}>
                      School is closed for classes. Attendance marking blocked.
                    </Text>
                  </View>
                )}
                {event.timetable_day_override && (
                  <View style={styles.impactItem}>
                    <Ionicons name="swap-horizontal-outline" size={16} color="#4F46E5" />
                    <Text style={styles.impactText}>
                      Special Working Day: Timetable follows {event.timetable_day_override} schedule.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Audience Targeting */}
            <View style={styles.targetSection}>
              <Text style={styles.sectionLabel}>{t('studentCalendar.targetAudience')}</Text>
              <View style={styles.targetPill}>
                <Ionicons name="people-outline" size={14} color={isDark ? '#94A3B8' : '#475569'} />
                <Text style={styles.targetPillText}>
                  {event.target_type === 'ENTIRE_SCHOOL'
                    ? t('studentCalendar.wholeSchool')
                    : `${event.target_type}: ${event.targets?.map((item) => item.target_name || item.target_id).join(', ') || t('studentCalendar.wholeSchool')}`}
                </Text>
              </View>
            </View>

            {/* Cross-Module Linked Action */}
            {event.source_module && (
              <TouchableOpacity
                style={styles.deepLinkBtn}
                onPress={handleModuleDeepLink}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={16} color="#4F46E5" />
                <Text style={styles.deepLinkBtnText}>
                  View source {event.source_module.toLowerCase()} details
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.deviceSyncBtn}
              onPress={handleSyncToDevice}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={16} color={theme.colors.text} />
              <Text style={styles.deviceSyncText}>{t('studentCalendar.addToCalendar')}</Text>
            </TouchableOpacity>

            {isAdmin && event.status === 'DRAFT' && (
              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublish}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.publishBtnText}>Publish</Text>
              </TouchableOpacity>
            )}

            {isAdmin && (
              <View style={styles.adminActionsRow}>
                {onEditEvent && (
                  <TouchableOpacity
                    style={styles.adminBtn}
                    onPress={() => {
                      onClose();
                      onEditEvent(event);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color="#4F46E5" />
                  </TouchableOpacity>
                )}

                {event.status !== 'CANCELLED' && (
                  <TouchableOpacity
                    style={styles.adminBtn}
                    onPress={handleCancel}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ban-outline" size={18} color="#D97706" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

function getStyles(theme: any, isDark: boolean, compact: boolean) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      alignItems: compact ? undefined : 'center',
      justifyContent: compact ? 'flex-end' : 'center',
      padding: compact ? 0 : 16,
    },
    modalCard: {
      ...clayCard(isDark, 'lg'),
      width: '100%',
      maxWidth: compact ? undefined : 520,
      maxHeight: compact ? '92%' : '85%',
      padding: compact ? 16 : 24,
      borderRadius: compact ? 0 : 28,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.16)',
      marginBottom: 12,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    typePillText: {
      fontSize: 12,
      fontWeight: '600',
    },
    priorityPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    priorityPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    draftBadge: {
      backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    draftBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#64748B',
    },
    cancelledBadge: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    cancelledBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#DC2626',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bodyScroll: {
      flexGrow: 0,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    titleTelugu: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
      marginBottom: 16,
    },
    infoBlock: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      borderRadius: 14,
      padding: 12,
      gap: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    infoIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 1,
    },
    descSection: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    descText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    descTextTelugu: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 19,
      marginTop: 4,
    },
    impactCard: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
    },
    impactTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#DC2626',
      marginBottom: 8,
    },
    impactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    impactText: {
      fontSize: 12,
      color: theme.colors.text,
      flex: 1,
    },
    targetSection: {
      marginBottom: 16,
    },
    targetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'flex-start',
    },
    targetPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    deepLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
      marginBottom: 16,
    },
    deepLinkBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4F46E5',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
      paddingTop: 16,
      marginTop: 8,
    },
    deviceSyncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    deviceSyncText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    publishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: '#059669',
    },
    publishBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    adminActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    adminBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
