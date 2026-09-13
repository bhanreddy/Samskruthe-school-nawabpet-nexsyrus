import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { clayCard, clayInset } from '../../theme/clayStyles';
import {
  CalendarEvent,
  CalendarEventType,
  CalendarCategory,
  CalendarPriority,
  CalendarTargetType,
  calendarService,
} from '../../services/calendarService';
import { PRIORITY_CONFIG, getEventTypeConfig, todayYmd } from './CalendarTheme';
import { alertCompat } from '../../utils/crossPlatformAlert';

interface Props {
  visible: boolean;
  initialDate?: string;
  editEvent?: CalendarEvent | null;
  onClose: () => void;
  onEventSaved: () => void;
}

const EVENT_TYPES: CalendarEventType[] = [
  'HOLIDAY',
  'SPECIAL_WORKING_DAY',
  'EXAM',
  'PTM',
  'SCHOOL_EVENT',
  'FEE_DUE',
  'HOMEWORK',
  'SPORTS',
  'CELEBRATION',
  'STAFF_MEETING',
  'TRAINING',
  'ADMISSION',
  'TRIP',
];

const CATEGORIES: CalendarCategory[] = [
  'ACADEMIC',
  'ADMINISTRATIVE',
  'CELEBRATION',
  'HOLIDAY',
  'EXAM',
  'FEES',
  'HOMEWORK',
  'SPORTS',
  'OTHER',
];

const TIMETABLE_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const CreateEventModal: React.FC<Props> = ({
  visible,
  initialDate,
  editEvent,
  onClose,
  onEventSaved,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const styles = React.useMemo(() => getStyles(theme, isDark, compact), [theme, isDark, compact]);

  const defaultDate = initialDate || todayYmd();

  const [title, setTitle] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('SCHOOL_EVENT');
  const [category, setCategory] = useState<CalendarCategory>('ACADEMIC');
  const [priority, setPriority] = useState<CalendarPriority>('NORMAL');
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayType, setHolidayType] = useState<string>('SCHOOL_DECLARED');
  const [timetableOverride, setTimetableOverride] = useState<string>('');
  const [targetType, setTargetType] = useState<CalendarTargetType>('ENTIRE_SCHOOL');
  const [location, setLocation] = useState('');

  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadTemplates();
      if (editEvent) {
        setTitle(editEvent.title || '');
        setTitleTe(editEvent.title_te || '');
        setDescription(editEvent.description || '');
        setEventType(editEvent.event_type || 'SCHOOL_EVENT');
        setCategory(editEvent.category || 'ACADEMIC');
        setPriority(editEvent.priority || 'NORMAL');
        setStartDate(editEvent.start_date || defaultDate);
        setEndDate(editEvent.end_date || defaultDate);
        setAllDay(editEvent.all_day ?? editEvent.is_all_day ?? true);
        setStartTime(editEvent.start_time || '09:00');
        setEndTime(editEvent.end_time || '16:00');
        setIsHoliday(editEvent.is_holiday ?? false);
        setHolidayType(editEvent.holiday_type || 'SCHOOL_DECLARED');
        setTimetableOverride(editEvent.timetable_day_override || '');
        setTargetType(editEvent.target_type || 'ENTIRE_SCHOOL');
        setLocation(editEvent.location || '');
      } else {
        resetForm();
        setStartDate(defaultDate);
        setEndDate(defaultDate);
      }
    }
  }, [visible, editEvent, defaultDate]);

  const resetForm = () => {
    setTitle('');
    setTitleTe('');
    setDescription('');
    setEventType('SCHOOL_EVENT');
    setCategory('ACADEMIC');
    setPriority('NORMAL');
    setAllDay(true);
    setStartTime('09:00');
    setEndTime('16:00');
    setIsHoliday(false);
    setHolidayType('SCHOOL_DECLARED');
    setTimetableOverride('');
    setTargetType('ENTIRE_SCHOOL');
    setLocation('');
    setConflictWarning(null);
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await calendarService.getTemplates();
      setTemplates(data);
    } catch {
      // templates optional
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (tpl: any) => {
    setTitle(tpl.name || '');
    if (tpl.name_te) setTitleTe(tpl.name_te);
    if (tpl.description) setDescription(tpl.description);
    if (tpl.event_type) setEventType(tpl.event_type);
    if (tpl.category) setCategory(tpl.category);
    if (tpl.is_holiday !== undefined) setIsHoliday(tpl.is_holiday);
    if (tpl.holiday_type) setHolidayType(tpl.holiday_type);
  };

  // Run conflict check when dates/times change
  useEffect(() => {
    if (!startDate) return;
    const check = async () => {
      try {
        const res = await calendarService.checkConflicts({
          start_date: startDate,
          end_date: endDate,
          start_time: allDay ? undefined : startTime,
          end_time: allDay ? undefined : endTime,
          target_type: targetType,
          exclude_event_id: editEvent?.id,
        });
        if (res.hasConflicts && res.conflicts.length > 0) {
          const first = res.conflicts[0];
          setConflictWarning(
            `Schedule Conflict: Overlaps with "${first.conflicting_event.title}" (${first.reason})`
          );
        } else {
          setConflictWarning(null);
        }
      } catch {
        // silently ignore check errors
      }
    };
    check();
  }, [startDate, endDate, startTime, endTime, allDay, targetType, editEvent]);

  const handleSave = async (publishImmediately = true) => {
    if (!title.trim()) {
      alertCompat('Validation Error', 'Event title is required');
      return;
    }
    if (!startDate) {
      alertCompat('Validation Error', 'Start date is required');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<CalendarEvent> = {
        title: title.trim(),
        title_te: titleTe.trim() || null,
        description: description.trim() || null,
        event_type: eventType,
        category: category,
        priority: priority,
        start_date: startDate,
        end_date: endDate || startDate,
        is_all_day: allDay,
        all_day: allDay,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        is_holiday: isHoliday,
        holiday_type: isHoliday ? (holidayType as any) : null,
        affects_attendance: isHoliday,
        affects_timetable: isHoliday || !!timetableOverride,
        timetable_day_override: timetableOverride || null,
        target_type: targetType,
        location: location.trim() || null,
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
      };

      if (editEvent) {
        await calendarService.updateEvent(editEvent.id, payload);
        alertCompat('Success', 'Calendar event updated');
      } else {
        await calendarService.createEvent(payload);
        alertCompat('Success', 'Calendar event created');
      }

      onEventSaved();
      onClose();
    } catch (err: any) {
      alertCompat('Error', err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editEvent ? 'Edit Calendar Event' : 'Schedule School Event'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Quick Templates Selector */}
            {!editEvent && templates.length > 0 && (
              <View style={styles.templatesBlock}>
                <Text style={styles.fieldLabel}>Pre-fill from Standard Templates</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplScroll}>
                  {templates.slice(0, 8).map((tpl) => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={styles.tplPill}
                      onPress={() => applyTemplate(tpl)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flash-outline" size={12} color="#4F46E5" />
                      <Text style={styles.tplPillText}>{tpl.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Conflict Warning Banner */}
            {conflictWarning && (
              <View style={styles.conflictBanner}>
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text style={styles.conflictText}>{conflictWarning}</Text>
              </View>
            )}

            {/* Title (English & Telugu) */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Event Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Independence Day Celebration"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Title in Telugu (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. స్వాతంత్ర్య దినోత్సవం"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={titleTe}
                onChangeText={setTitleTe}
              />
            </View>

            {/* Event Type Grid */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Event Type</Text>
              <View style={styles.pillsWrap}>
                {EVENT_TYPES.map((type) => {
                  const cfg = getEventTypeConfig(type);
                  const selected = eventType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.selectPill,
                        selected && { backgroundColor: cfg.color, borderColor: cfg.color },
                      ]}
                      onPress={() => {
                        setEventType(type);
                        if (type === 'HOLIDAY') setIsHoliday(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.selectPillText,
                          selected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range Fields */}
            <View style={[styles.rowFields, compact && styles.rowFieldsStacked]}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-09-15"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-09-15"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                />
              </View>
            </View>

            {/* All Day Toggle & Time Fields */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>All-Day Event</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: '#94A3B8', true: '#4F46E5' }}
              />
            </View>

            {!allDay && (
              <View style={[styles.rowFields, compact && styles.rowFieldsStacked]}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  />
                </View>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="16:00"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  />
                </View>
              </View>
            )}

            {/* Holiday Toggle */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Declare as Official Holiday</Text>
                <Text style={styles.switchSub}>
                  Blocks regular attendance marking and closes school
                </Text>
              </View>
              <Switch
                value={isHoliday}
                onValueChange={setIsHoliday}
                trackColor={{ false: '#94A3B8', true: '#DC2626' }}
              />
            </View>

            {/* Special Working Day / Timetable Override */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Timetable Day Override (Optional)</Text>
              <Text style={styles.switchSub}>
                e.g. When a Saturday runs on a Monday schedule
              </Text>
              <View style={styles.pillsWrap}>
                <TouchableOpacity
                  style={[
                    styles.selectPill,
                    timetableOverride === '' && styles.activePillStandard,
                  ]}
                  onPress={() => setTimetableOverride('')}
                >
                  <Text style={[styles.selectPillText, timetableOverride === '' && styles.activePillTextStandard]}>
                    Standard Day
                  </Text>
                </TouchableOpacity>
                {TIMETABLE_DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.selectPill,
                      timetableOverride === day && styles.activePillSpecial,
                    ]}
                    onPress={() => setTimetableOverride(day)}
                  >
                    <Text
                      style={[
                        styles.selectPillText,
                        timetableOverride === day && styles.activePillTextSpecial,
                      ]}
                    >
                      {day} TT
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority & Target Audience */}
            <View style={[styles.rowFields, compact && styles.rowFieldsStacked]}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.pillsWrap}>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as CalendarPriority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.selectPill,
                        priority === p && { backgroundColor: PRIORITY_CONFIG[p].color },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.selectPillText,
                          priority === p && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {PRIORITY_CONFIG[p].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Location & Description */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Location / Venue</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Main Auditorium / Ground"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description & Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Additional instructions, dress code, parent guidance..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.draftBtn}
              onPress={() => handleSave(false)}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.draftBtnText}>Save as Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => handleSave(true)}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {editEvent ? 'Update & Publish' : 'Publish Event'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: compact ? 'flex-end' : 'center',
      alignItems: compact ? undefined : 'center',
      padding: compact ? 0 : 16,
    },
    card: {
      ...clayCard(isDark, 'lg'),
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: compact ? 0 : 28,
      borderBottomRightRadius: compact ? 0 : 28,
      width: compact ? '100%' : '100%',
      maxWidth: compact ? undefined : 560,
      maxHeight: compact ? '94%' : '88%',
      padding: compact ? 16 : 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      flex: 1,
      fontSize: compact ? 16 : 18,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.3,
      paddingRight: 8,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollBody: {
      flexGrow: 0,
    },
    templatesBlock: {
      marginBottom: 14,
    },
    tplScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    tplPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(79, 70, 229, 0.3)' : '#C7D2FE',
    },
    tplPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4F46E5',
    },
    conflictBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2',
      borderRadius: 10,
      padding: 10,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#DC2626',
    },
    conflictText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#DC2626',
      flex: 1,
    },
    field: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#475569',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    textInput: {
      ...clayInset(isDark),
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.colors.text,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    rowFields: {
      flexDirection: 'row',
      gap: 12,
    },
    rowFieldsStacked: {
      flexDirection: 'column',
      gap: 0,
    },
    pillsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    selectPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
    },
    selectPillText: {
      fontSize: 12,
      color: isDark ? '#CBD5E1' : '#475569',
      fontWeight: '500',
    },
    activePillStandard: {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    activePillTextStandard: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    activePillSpecial: {
      backgroundColor: '#4F46E5',
      borderColor: '#4F46E5',
    },
    activePillTextSpecial: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      marginBottom: 14,
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    switchSub: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    footer: {
      flexDirection: compact ? 'column-reverse' : 'row',
      alignItems: 'stretch',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
      paddingTop: 16,
      marginTop: 10,
    },
    draftBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
    },
    draftBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    saveBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#4F46E5',
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
