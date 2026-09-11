export type TimetableSlotLike = {
  class_section_id?: string;
  class_name?: string;
  section_name?: string;
  subject_id?: string;
  subject_name?: string;
  period_number?: number;
  start_time?: string;
  end_time?: string;
  day_of_week?: string;
  is_substitution?: boolean;
};

export function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClock(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return '';
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

export function classLabel(slot?: { class_name?: string; section_name?: string } | null): string {
  if (!slot) return '';
  return `${slot.class_name || ''}${slot.section_name || ''}`.trim();
}

export function detectCurrentClass(
  slots: TimetableSlotLike[],
  now: { weekday: string; minutes: number; uniform?: boolean },
) {
  const weekday = String(now.weekday || '').toLowerCase();
  const todaySlots = (slots || [])
    .filter((slot) => {
      const day = String(slot.day_of_week || '').toLowerCase();
      return !day || day === weekday || (now.uniform && day === 'monday');
    })
    .map((slot) => ({
      ...slot,
      startMinutes: parseTimeToMinutes(slot.start_time),
      endMinutes: parseTimeToMinutes(slot.end_time),
    }))
    .filter((slot) => slot.startMinutes != null && slot.endMinutes != null)
    .sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));

  const current = todaySlots.find((slot) => now.minutes >= (slot.startMinutes || 0) && now.minutes < (slot.endMinutes || 0));
  if (current) return { slot: current, match: 'current' as const };
  const next = todaySlots.find((slot) => (slot.startMinutes || 0) > now.minutes);
  if (next) return { slot: next, match: 'next' as const };
  const previous = [...todaySlots].reverse().find((slot) => (slot.endMinutes || 0) <= now.minutes);
  if (previous) return { slot: previous, match: 'previous' as const };
  return { slot: null, match: 'none' as const };
}

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
