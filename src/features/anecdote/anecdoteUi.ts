export const ANECDOTE_CONTEXTS = [
  { key: 'classroom', label: 'Classroom', icon: 'school-outline' },
  { key: 'playground', label: 'Playground', icon: 'sunny-outline' },
  { key: 'laboratory', label: 'Laboratory', icon: 'flask-outline' },
  { key: 'corridor', label: 'Corridor', icon: 'walk-outline' },
  { key: 'assembly', label: 'Assembly', icon: 'people-outline' },
  { key: 'sports_field', label: 'Sports field', icon: 'football-outline' },
  { key: 'bus', label: 'Bus', icon: 'bus-outline' },
  { key: 'cafeteria', label: 'Dining hall', icon: 'restaurant-outline' },
  { key: 'online', label: 'Online', icon: 'laptop-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
] as const;

export const ANECDOTE_TYPES = [
  { key: 'OBSERVATION', label: 'Observation', icon: 'eye-outline', color: '#6366F1' },
  { key: 'RECOGNITION', label: 'Recognition', icon: 'ribbon-outline', color: '#10B981' },
  { key: 'IMPROVEMENT', label: 'Improvement', icon: 'trending-up-outline', color: '#3B82F6' },
  { key: 'CONCERN', label: 'Concern', icon: 'alert-circle-outline', color: '#F59E0B' },
  { key: 'INCIDENT', label: 'Incident', icon: 'warning-outline', color: '#EF4444' },
  { key: 'ACHIEVEMENT', label: 'Achievement', icon: 'trophy-outline', color: '#EC4899' },
] as const;

export const ANECDOTE_SEVERITIES = [
  { key: 'LEVEL_0_INFORMATIONAL', label: 'Note', hint: 'Everyday remark', color: '#64748B' },
  { key: 'LEVEL_1_POSITIVE', label: 'Strength', hint: 'Celebrate this', color: '#059669' },
  { key: 'LEVEL_2_WATCH', label: 'Watch', hint: 'Keep an eye', color: '#D97706' },
  { key: 'LEVEL_3_ATTENTION', label: 'Attention', hint: 'Needs follow-up', color: '#EA580C' },
  { key: 'LEVEL_4_CRITICAL', label: 'Urgent', hint: 'Act today', color: '#EF4444' },
] as const;

export const CATEGORY_FALLBACKS = [
  { key: 'ALL', code: 'ALL', label: 'All', icon: 'layers-outline', color: '#6366F1' },
  { key: 'ACADEMIC', code: 'ACADEMIC', label: 'Academic', icon: 'book-outline', color: '#2563EB' },
  { key: 'BEHAVIOUR', code: 'BEHAVIOUR', label: 'Behaviour', icon: 'shield-outline', color: '#EA580C' },
  { key: 'SOCIAL', code: 'SOCIAL', label: 'Social', icon: 'heart-outline', color: '#0D9488' },
  { key: 'ACHIEVEMENT', code: 'ACHIEVEMENT', label: 'Achievement', icon: 'trophy-outline', color: '#F59E0B' },
  { key: 'ATTENDANCE', code: 'ATTENDANCE', label: 'Attendance', icon: 'calendar-outline', color: '#9333EA' },
  { key: 'PARTICIPATION', code: 'PARTICIPATION', label: 'Participation', icon: 'sparkles-outline', color: '#0284C7' },
];

export const OBSERVATION_PROMPTS = [
  {
    id: 'helped',
    label: 'Helped a classmate',
    text: 'Helped a classmate understand a difficult concept during group work.',
    icon: 'heart-outline' as const,
    color: '#0D9488',
  },
  {
    id: 'prize',
    label: 'Won a prize',
    text: 'Won a prize in a school competition and represented the class with pride.',
    icon: 'trophy-outline' as const,
    color: '#F59E0B',
  },
  {
    id: 'engaged',
    label: 'Strong in class',
    text: 'Answered enthusiastically and asked thoughtful questions throughout the lesson.',
    icon: 'hand-right-outline' as const,
    color: '#2563EB',
  },
  {
    id: 'support',
    label: 'Needs support',
    text: 'Seemed to struggle with the lesson today and may need extra support.',
    icon: 'alert-circle-outline' as const,
    color: '#EA580C',
  },
  {
    id: 'late',
    label: 'Arrived late',
    text: 'Arrived late to school after the morning bell.',
    icon: 'time-outline' as const,
    color: '#9333EA',
  },
];

const CONTEXT_ALIASES: Record<string, string> = {
  classroom: 'classroom',
  class: 'classroom',
  playground: 'playground',
  laboratory: 'laboratory',
  lab: 'laboratory',
  corridor: 'corridor',
  hallway: 'corridor',
  assembly: 'assembly',
  bus: 'bus',
  'bus / transport': 'bus',
  transport: 'bus',
  sports_field: 'sports_field',
  'sports ground': 'sports_field',
  'sports field': 'sports_field',
  cafeteria: 'cafeteria',
  'dining hall': 'cafeteria',
  canteen: 'cafeteria',
  library: 'other',
  online: 'online',
  other: 'other',
};

export function normalizeContext(raw?: string | null): string {
  const key = String(raw || 'classroom').trim().toLowerCase();
  return CONTEXT_ALIASES[key] || 'classroom';
}

export function contextLabel(raw?: string | null): string {
  const key = normalizeContext(raw);
  return ANECDOTE_CONTEXTS.find((item) => item.key === key)?.label || 'Classroom';
}

export function typeMeta(raw?: string | null) {
  return ANECDOTE_TYPES.find((item) => item.key === raw) || ANECDOTE_TYPES[0];
}

export function severityMeta(raw?: string | null) {
  return ANECDOTE_SEVERITIES.find((item) => item.key === raw) || ANECDOTE_SEVERITIES[0];
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function dayGroupLabel(iso?: string | null): string {
  if (!iso) return 'Earlier';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function studentDisplayName(student: any): string {
  const person = student?.person || {};
  return (
    student?.display_name ||
    person.display_name ||
    [student?.first_name || person.first_name, student?.last_name || person.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    'Student'
  );
}

export function mapStudentOption(student: any): {
  id: string;
  display_name: string;
  admission_no?: string;
  photo_url?: string | null;
  class_name?: string;
} {
  const person = student?.person || {};
  const enrollment = student?.current_enrollment || {};
  const className = [enrollment.class_name || student?.class_name, enrollment.section_name || student?.section_name]
    .filter(Boolean)
    .join(' ');

  return {
    id: String(student.id),
    display_name: studentDisplayName(student),
    admission_no: student.admission_no,
    photo_url: student.photo_url || person.photo_url || null,
    class_name: className || undefined,
  };
}

export function isSameDay(iso?: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isWithinDays(iso?: string | null, days = 7, now = new Date()): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return now.getTime() - date.getTime() <= days * 86400000;
}
