import { CalendarPriority } from '../../services/calendarService';

export const EVENT_TYPE_CONFIG: Record<string, {
  label: string; icon: string; color: string; bgLight: string; bgDark: string; borderLight: string; borderDark: string
}> = {
  HOLIDAY: {
    label: 'Holiday',
    icon: 'sunny-outline',
    color: '#DC2626', // Red
    bgLight: '#FEF2F2',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    borderLight: '#FECACA',
    borderDark: 'rgba(239, 68, 68, 0.3)',
  },
  EXAM: {
    label: 'Examination',
    icon: 'school-outline',
    color: '#4F46E5', // Indigo
    bgLight: '#EEF2FF',
    bgDark: 'rgba(79, 70, 229, 0.15)',
    borderLight: '#C7D2FE',
    borderDark: 'rgba(79, 70, 229, 0.3)',
  },
  MEETING: {
    label: 'PTM / Meeting',
    icon: 'people-outline',
    color: '#D97706', // Amber
    bgLight: '#FFFBEB',
    bgDark: 'rgba(217, 119, 6, 0.15)',
    borderLight: '#FDE68A',
    borderDark: 'rgba(217, 119, 6, 0.3)',
  },
  ACTIVITY: {
    label: 'Activity',
    icon: 'color-palette-outline',
    color: '#0D9488', // Teal
    bgLight: '#F0FDFA',
    bgDark: 'rgba(13, 148, 136, 0.15)',
    borderLight: '#99F6E4',
    borderDark: 'rgba(13, 148, 136, 0.3)',
  },
  FEE_DUE: {
    label: 'Fee Due',
    icon: 'cash-outline',
    color: '#EA580C', // Orange
    bgLight: '#FFF7ED',
    bgDark: 'rgba(234, 88, 12, 0.15)',
    borderLight: '#FED7AA',
    borderDark: 'rgba(234, 88, 12, 0.3)',
  },
  HOMEWORK_DUE: {
    label: 'Homework Due',
    icon: 'book-outline',
    color: '#2563EB', // Blue
    bgLight: '#EFF6FF',
    bgDark: 'rgba(37, 99, 235, 0.15)',
    borderLight: '#BFDBFE',
    borderDark: 'rgba(37, 99, 235, 0.3)',
  },
  SPORTS: {
    label: 'Sports Day / Match',
    icon: 'football-outline',
    color: '#16A34A', // Green
    bgLight: '#F0FDF4',
    bgDark: 'rgba(22, 163, 74, 0.15)',
    borderLight: '#BBF7D0',
    borderDark: 'rgba(22, 163, 74, 0.3)',
  },
  CULTURAL: {
    label: 'Cultural Event',
    icon: 'sparkles-outline',
    color: '#9333EA', // Purple
    bgLight: '#FAF5FF',
    bgDark: 'rgba(147, 51, 234, 0.15)',
    borderLight: '#E9D5FF',
    borderDark: 'rgba(147, 51, 234, 0.3)',
  },
  STAFF_TRAINING: {
    label: 'Staff Training',
    icon: 'briefcase-outline',
    color: '#0284C7', // Sky
    bgLight: '#F0F9FF',
    bgDark: 'rgba(2, 132, 199, 0.15)',
    borderLight: '#BAE6FD',
    borderDark: 'rgba(2, 132, 199, 0.3)',
  },
  ADMISSION: {
    label: 'Admissions',
    icon: 'person-add-outline',
    color: '#059669', // Emerald
    bgLight: '#ECFDF5',
    bgDark: 'rgba(5, 150, 105, 0.15)',
    borderLight: '#A7F3D0',
    borderDark: 'rgba(5, 150, 105, 0.3)',
  },
  GENERAL: {
    label: 'School Event',
    icon: 'calendar-outline',
    color: '#475569',
    bgLight: '#F8FAFC',
    bgDark: 'rgba(71, 85, 105, 0.15)',
    borderLight: '#E2E8F0',
    borderDark: 'rgba(71, 85, 105, 0.3)',
  },
  SCHOOL_EVENT: {
    label: 'School Event',
    icon: 'calendar-outline',
    color: '#475569',
    bgLight: '#F8FAFC',
    bgDark: 'rgba(71, 85, 105, 0.15)',
    borderLight: '#E2E8F0',
    borderDark: 'rgba(71, 85, 105, 0.3)',
  },
  PTM: {
    label: 'Parent Teacher Meeting',
    icon: 'people-outline',
    color: '#D97706',
    bgLight: '#FFFBEB',
    bgDark: 'rgba(217, 119, 6, 0.15)',
    borderLight: '#FDE68A',
    borderDark: 'rgba(217, 119, 6, 0.3)',
  },
  SPECIAL_WORKING_DAY: {
    label: 'Special Working Day',
    icon: 'briefcase-outline',
    color: '#10B981',
    bgLight: '#ECFDF5',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    borderLight: '#A7F3D0',
    borderDark: 'rgba(16, 185, 129, 0.3)',
  },
  HOMEWORK: {
    label: 'Homework',
    icon: 'book-outline',
    color: '#2563EB',
    bgLight: '#EFF6FF',
    bgDark: 'rgba(37, 99, 235, 0.15)',
    borderLight: '#BFDBFE',
    borderDark: 'rgba(37, 99, 235, 0.3)',
  },
  VACATION: {
    label: 'Vacation',
    icon: 'airplane-outline',
    color: '#F59E0B',
    bgLight: '#FFFBEB',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    borderLight: '#FDE68A',
    borderDark: 'rgba(245, 158, 11, 0.3)',
  },
  STAFF_MEETING: {
    label: 'Staff Meeting',
    icon: 'chatbubbles-outline',
    color: '#6366F1',
    bgLight: '#EEF2FF',
    bgDark: 'rgba(99, 102, 241, 0.15)',
    borderLight: '#C7D2FE',
    borderDark: 'rgba(99, 102, 241, 0.3)',
  },
  TRAINING: {
    label: 'Training',
    icon: 'briefcase-outline',
    color: '#0284C7',
    bgLight: '#F0F9FF',
    bgDark: 'rgba(2, 132, 199, 0.15)',
    borderLight: '#BAE6FD',
    borderDark: 'rgba(2, 132, 199, 0.3)',
  },
  CELEBRATION: {
    label: 'Celebration',
    icon: 'sparkles-outline',
    color: '#9333EA',
    bgLight: '#FAF5FF',
    bgDark: 'rgba(147, 51, 234, 0.15)',
    borderLight: '#E9D5FF',
    borderDark: 'rgba(147, 51, 234, 0.3)',
  },
  WORKING_DAY: {
    label: 'Working Day',
    icon: 'briefcase-outline',
    color: '#0F766E',
    bgLight: '#F0FDFA',
    bgDark: 'rgba(15, 118, 110, 0.15)',
    borderLight: '#99F6E4',
    borderDark: 'rgba(15, 118, 110, 0.3)',
  },
  TEST: {
    label: 'Unit Test',
    icon: 'document-text-outline',
    color: '#06B6D4',
    bgLight: '#ECFEFF',
    bgDark: 'rgba(6, 182, 212, 0.15)',
    borderLight: '#A5F3FC',
    borderDark: 'rgba(6, 182, 212, 0.3)',
  },
  RESULT: {
    label: 'Results',
    icon: 'ribbon-outline',
    color: '#7C3AED',
    bgLight: '#F5F3FF',
    bgDark: 'rgba(124, 58, 237, 0.15)',
    borderLight: '#DDD6FE',
    borderDark: 'rgba(124, 58, 237, 0.3)',
  },
  COMPETITION: {
    label: 'Competition',
    icon: 'trophy-outline',
    color: '#CA8A04',
    bgLight: '#FEFCE8',
    bgDark: 'rgba(202, 138, 4, 0.15)',
    borderLight: '#FEF08A',
    borderDark: 'rgba(202, 138, 4, 0.3)',
  },
  TRIP: {
    label: 'Trip',
    icon: 'bus-outline',
    color: '#0891B2',
    bgLight: '#ECFEFF',
    bgDark: 'rgba(8, 145, 178, 0.15)',
    borderLight: '#A5F3FC',
    borderDark: 'rgba(8, 145, 178, 0.3)',
  },
  FEE_LATE_DATE: {
    label: 'Late Fee',
    icon: 'alert-circle-outline',
    color: '#B91C1C',
    bgLight: '#FEF2F2',
    bgDark: 'rgba(185, 28, 28, 0.15)',
    borderLight: '#FECACA',
    borderDark: 'rgba(185, 28, 28, 0.3)',
  },
  DOCUMENT_DEADLINE: {
    label: 'Document Deadline',
    icon: 'document-attach-outline',
    color: '#7C2D12',
    bgLight: '#FFF7ED',
    bgDark: 'rgba(124, 45, 18, 0.15)',
    borderLight: '#FED7AA',
    borderDark: 'rgba(124, 45, 18, 0.3)',
  },
  PROJECT: {
    label: 'Project',
    icon: 'construct-outline',
    color: '#1D4ED8',
    bgLight: '#EFF6FF',
    bgDark: 'rgba(29, 78, 216, 0.15)',
    borderLight: '#BFDBFE',
    borderDark: 'rgba(29, 78, 216, 0.3)',
  },
  ASSEMBLY: {
    label: 'Assembly',
    icon: 'megaphone-outline',
    color: '#0E7490',
    bgLight: '#ECFEFF',
    bgDark: 'rgba(14, 116, 144, 0.15)',
    borderLight: '#A5F3FC',
    borderDark: 'rgba(14, 116, 144, 0.3)',
  },
  TRANSPORT_EVENT: {
    label: 'Transport',
    icon: 'bus-outline',
    color: '#0369A1',
    bgLight: '#F0F9FF',
    bgDark: 'rgba(3, 105, 161, 0.15)',
    borderLight: '#BAE6FD',
    borderDark: 'rgba(3, 105, 161, 0.3)',
  },
  CUSTOM: {
    label: 'Custom',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#64748B',
    bgLight: '#F8FAFC',
    bgDark: 'rgba(100, 116, 139, 0.15)',
    borderLight: '#E2E8F0',
    borderDark: 'rgba(100, 116, 139, 0.3)',
  },
};

export function getEventTypeConfig(eventType?: string) {
  return EVENT_TYPE_CONFIG[eventType || ''] || EVENT_TYPE_CONFIG.SCHOOL_EVENT || EVENT_TYPE_CONFIG.GENERAL;
}

export const PRIORITY_CONFIG: Record<
  CalendarPriority,
  { label: string; color: string; badge: string }
> = {
  LOW: { label: 'Low', color: '#64748B', badge: 'rgba(100, 116, 139, 0.1)' },
  NORMAL: { label: 'Normal', color: '#0284C7', badge: 'rgba(2, 132, 199, 0.1)' },
  MEDIUM: { label: 'Normal', color: '#0284C7', badge: 'rgba(2, 132, 199, 0.1)' },
  HIGH: { label: 'High', color: '#EA580C', badge: 'rgba(234, 88, 12, 0.1)' },
  URGENT: { label: 'Urgent', color: '#DC2626', badge: 'rgba(220, 38, 38, 0.15)' },
};

export function toLocalYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayYmd(): string {
  return toLocalYmd(new Date());
}

export function parseYmd(ymd: string): Date {
  const [year, month, day] = (ymd || '').split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function addDaysYmd(ymd: string, days: number): string {
  const next = parseYmd(ymd);
  next.setDate(next.getDate() + days);
  return toLocalYmd(next);
}

export function formatEventDateRange(startDate: string, endDate?: string, allDay = true, startTime?: string | null, endTime?: string | null): string {
  if (!startDate) return '';
  const start = parseYmd(startDate);
  const startStr = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  
  if (endDate && endDate !== startDate) {
    const end = parseYmd(endDate);
    const endStr = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }

  if (!allDay && startTime) {
    const timeFormatted = endTime ? `${startTime} - ${endTime}` : startTime;
    return `${startStr} • ${timeFormatted}`;
  }

  return startStr;
}

export function formatEventTime(allDay: boolean, startTime?: string | null, endTime?: string | null): string {
  if (allDay) return 'All Day';
  if (!startTime) return 'Schedule TBD';
  if (endTime) return `${startTime} – ${endTime}`;
  return startTime;
}

export function formatAudience(targetType?: string): string {
  if (!targetType || targetType === 'ENTIRE_SCHOOL') return 'Whole school';
  return targetType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shiftMonthKeepingDay(current: Date, deltaMonths: number, selectedYmd: string): {
  nextMonth: Date;
  nextSelected: string;
} {
  const nextMonth = new Date(current.getFullYear(), current.getMonth() + deltaMonths, 1);
  const selected = parseYmd(selectedYmd);
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const day = Math.min(selected.getDate(), lastDay);
  return {
    nextMonth,
    nextSelected: toLocalYmd(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day)),
  };
}

export function formatDayParts(ymd: string): {
  numeral: string;
  weekday: string;
  weekdayShort: string;
  monthYear: string;
  relative: string;
} {
  const d = parseYmd(ymd);
  const today = todayYmd();
  const relative =
    ymd === today ? 'Today' : ymd === addDaysYmd(today, 1) ? 'Tomorrow' : ymd === addDaysYmd(today, -1) ? 'Yesterday' : '';

  return {
    numeral: String(d.getDate()),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    weekdayShort: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    monthYear: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    relative,
  };
}

export function formatAgendaDateLabel(ymd: string): string {
  const parts = formatDayParts(ymd);
  const d = parseYmd(ymd);
  const dateBit = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return parts.relative ? `${parts.relative} · ${dateBit}` : `${parts.weekdayShort} · ${dateBit}`;
}
