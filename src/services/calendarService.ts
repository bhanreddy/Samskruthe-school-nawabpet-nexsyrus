import { apiClient, getApiBaseUrl } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CalendarEventType =
  | 'HOLIDAY'
  | 'VACATION'
  | 'WORKING_DAY'
  | 'SPECIAL_WORKING_DAY'
  | 'EXAM'
  | 'TEST'
  | 'RESULT'
  | 'PTM'
  | 'SCHOOL_EVENT'
  | 'SPORTS'
  | 'COMPETITION'
  | 'TRIP'
  | 'STAFF_MEETING'
  | 'TRAINING'
  | 'FEE_DUE'
  | 'FEE_LATE_DATE'
  | 'ADMISSION'
  | 'DOCUMENT_DEADLINE'
  | 'HOMEWORK'
  | 'PROJECT'
  | 'ASSEMBLY'
  | 'CELEBRATION'
  | 'TRANSPORT_EVENT'
  | 'CUSTOM'
  // legacy aliases still accepted by the API
  | 'MEETING'
  | 'ACTIVITY'
  | 'HOMEWORK_DUE'
  | 'CULTURAL'
  | 'STAFF_TRAINING'
  | 'GENERAL';

export type CalendarCategory =
  | 'ACADEMIC'
  | 'ADMINISTRATIVE'
  | 'CELEBRATION'
  | 'HOLIDAY'
  | 'EXAM'
  | 'FEES'
  | 'HOMEWORK'
  | 'SPORTS'
  | 'OTHER';

export type CalendarTargetType =
  | 'ENTIRE_SCHOOL'
  | 'ROLE'
  | 'CLASS'
  | 'SECTION'
  | 'USER'
  | 'STUDENT';

export type CalendarPriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CalendarStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED' | 'REJECTED';

export interface CalendarEventTarget {
  id?: string;
  calendar_event_id?: string;
  target_type: CalendarTargetType;
  target_id?: string | null;
  target_name?: string | null;
}

export interface CalendarEventReminder {
  id?: string;
  calendar_event_id?: string;
  reminder_offset_minutes: number;
  channel: 'IN_APP' | 'PUSH' | 'SMS' | 'WHATSAPP';
  sent_at?: string | null;
}

export interface CalendarEvent {
  id: string;
  school_id: number;
  academic_year_id?: number | null;
  academic_term_id?: string | null;
  title: string;
  title_te?: string | null;
  description?: string | null;
  description_te?: string | null;
  event_type: CalendarEventType;
  category: CalendarCategory;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  start_time?: string | null; // HH:mm
  end_time?: string | null;   // HH:mm
  all_day?: boolean;
  is_all_day?: boolean;
  is_holiday: boolean;
  is_working_day: boolean;
  holiday_type?: 'NATIONAL' | 'STATE' | 'REGIONAL' | 'SCHOOL_DECLARED' | 'EMERGENCY_UNPLANNED' | null;
  affects_attendance: boolean;
  affects_timetable: boolean;
  timetable_day_override?: string | null;
  target_type: CalendarTargetType;
  target_ids?: string[];
  targets?: CalendarEventTarget[];
  reminders?: CalendarEventReminder[];
  location?: string | null;
  priority: CalendarPriority;
  status: CalendarStatus;
  source_module?: string | null;
  source_id?: string | null;
  color?: string | null;
  icon?: string | null;
  metadata?: Record<string, any>;
  recurrence_rule?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicTerm {
  id: string;
  school_id: number;
  academic_year_id: number;
  name: string;
  term_type: 'SEMESTER' | 'TRIMESTER' | 'QUARTER' | 'ANNUAL' | 'CUSTOM';
  start_date: string;
  end_date: string;
  is_current: boolean;
  working_days_target?: number | null;
}

export interface SchoolDayStatus {
  date: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  isSpecialWorkingDay: boolean;
  holidayName?: string;
  holidayType?: string;
  timetableOverride?: string | null;
  timetableDay: string;
  attendanceAllowed: boolean;
  events: CalendarEvent[];
}

export interface CalendarAnalytics {
  total_working_days: number;
  holidays_count: number;
  exams_count: number;
  events_count: number;
  events_by_type: Record<string, number>;
  events_by_month: Array<{ month: string; count: number }>;
}

export interface CalendarConflict {
  conflicting_event: CalendarEvent;
  conflict_type: string;
  reason: string;
}

export interface CalendarFilterParams {
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM
  academicYearId?: number;
  eventType?: CalendarEventType | 'ALL';
  category?: CalendarCategory | 'ALL';
  targetType?: CalendarTargetType | 'ALL';
  targetId?: string;
  studentId?: string;
  status?: CalendarStatus | 'ALL';
  search?: string;
}

export function monthWindow(currentDate: Date): { startDate: string; endDate: string; year: number; month: number } {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const start = new Date(year, currentDate.getMonth() - 1, 1);
  const end = new Date(year, currentDate.getMonth() + 2, 0);
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: toYmd(start), endDate: toYmd(end), year, month };
}

const CALENDAR_CACHE_PREFIX = 'schoolims.calendar.cache.';

async function readCachedEvents(key: string): Promise<CalendarEvent[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CALENDAR_CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.events) ? parsed.events : null;
  } catch {
    return null;
  }
}

async function writeCachedEvents(key: string, events: CalendarEvent[]) {
  try {
    await AsyncStorage.setItem(
      CALENDAR_CACHE_PREFIX + key,
      JSON.stringify({ events, storedAt: Date.now() })
    );
  } catch {
    // cache is best-effort
  }
}

export const calendarService = {
  /**
   * Fetch calendar events with optional multi-criteria filters
   */
  getEvents: async (params?: CalendarFilterParams): Promise<CalendarEvent[]> => {
    const queryParams: Record<string, string> = {};
    if (params?.startDate) {
      queryParams.start_date = params.startDate;
      queryParams.startDate = params.startDate;
    }
    if (params?.endDate) {
      queryParams.end_date = params.endDate;
      queryParams.endDate = params.endDate;
    }
    if (params?.month) queryParams.month = params.month;
    if (params?.academicYearId) queryParams.academic_year_id = String(params.academicYearId);
    if (params?.eventType && params.eventType !== 'ALL') queryParams.event_type = params.eventType;
    if (params?.studentId) queryParams.student_id = params.studentId;
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;

    const cacheKey = JSON.stringify(queryParams);
    try {
      const response = await apiClient.get<any>('/calendar', queryParams);
      const events = Array.isArray(response) ? response : (response?.events || []);
      await writeCachedEvents(cacheKey, events);
      return events;
    } catch (err) {
      const cached = await readCachedEvents(cacheKey);
      if (cached) {
        return cached.map((event) => ({ ...event, metadata: { ...(event.metadata || {}), stale: true } }));
      }
      throw err;
    }
  },

  /**
   * Fetch upcoming high-priority events for widgets and home dashboards
   */
  getUpcomingEvents: async (limit = 5, studentId?: string): Promise<CalendarEvent[]> => {
    const queryParams: Record<string, string> = { limit: String(limit) };
    if (studentId) queryParams.studentId = studentId;

    const response = await apiClient.get<any>(
      '/calendar/upcoming',
      queryParams
    );
    return Array.isArray(response) ? response : (response?.events || []);
  },

  /**
   * Fetch single event details including targets and reminders
   */
  getEventById: async (id: string): Promise<CalendarEvent> => {
    const response = await apiClient.get<any>(`/calendar/${id}`);
    return response?.event || response;
  },

  /**
   * Create a new calendar event
   */
  createEvent: async (payload: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await apiClient.post<any>(
      '/calendar',
      payload
    );
    return response?.event || response;
  },

  /**
   * Update an existing calendar event
   */
  updateEvent: async (id: string, payload: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await apiClient.put<any>(
      `/calendar/${id}`,
      payload
    );
    return response?.event || response;
  },

  /**
   * Edit a recurring event occurrence or series
   */
  updateRecurringEvent: async (id: string, payload: {
    scope: 'THIS_EVENT' | 'THIS_AND_FUTURE' | 'ENTIRE_SERIES';
    occurrence_date?: string;
    [key: string]: any;
  }): Promise<CalendarEvent> => {
    const response = await apiClient.put<any>(
      `/calendar/${id}/recurrence`,
      payload
    );
    return response?.event || response;
  },

  /**
   * Publish a draft event
   */
  publishEvent: async (id: string): Promise<CalendarEvent> => {
    const response = await apiClient.post<any>(
      `/calendar/${id}/publish`
    );
    return response?.event || response;
  },

  /**
   * Cancel an event with optional notification reason
   */
  cancelEvent: async (id: string, reason?: string): Promise<CalendarEvent> => {
    const response = await apiClient.post<any>(
      `/calendar/${id}/cancel`,
      { cancellation_reason: reason, reason }
    );
    return response?.event || response;
  },

  /**
   * Soft-delete an event
   */
  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/calendar/${id}`);
  },

  /**
   * Check school working day / holiday / timetable override status for a date
   */
  getDayStatus: async (date: string): Promise<SchoolDayStatus> => {
    const response = await apiClient.get<any>(
      '/calendar/day-status',
      { date }
    );
    return response?.status || response;
  },

  /**
   * Detect event conflicts before creating/updating
   */
  checkConflicts: async (payload: {
    start_date: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    target_type?: string;
    target_ids?: string[];
    exclude_event_id?: string;
  }): Promise<{ hasConflicts: boolean; conflicts: CalendarConflict[] }> => {
    return apiClient.get<{ hasConflicts: boolean; conflicts: CalendarConflict[] }>(
      '/calendar/conflicts',
      {
        startDate: payload.start_date,
        endDate: payload.end_date || payload.start_date,
        startTime: payload.start_time || '',
        endTime: payload.end_time || '',
        targetType: payload.target_type || '',
        targetIds: payload.target_ids ? payload.target_ids.join(',') : '',
        excludeId: payload.exclude_event_id || '',
      }
    );
  },

  /**
   * Fetch calendar summary analytics
   */
  getAnalytics: async (academicYearId?: number): Promise<CalendarAnalytics> => {
    const params: Record<string, string> = {};
    if (academicYearId) params.academicYearId = String(academicYearId);
    return apiClient.get<CalendarAnalytics>('/calendar/analytics', params);
  },

  /**
   * Fetch standard Indian school calendar event templates
   */
  getTemplates: async (): Promise<any[]> => {
    const response = await apiClient.get<any>('/calendar/templates');
    return Array.isArray(response) ? response : (response?.templates || []);
  },

  /**
   * Academic terms management
   */
  getTerms: async (academicYearId?: number): Promise<AcademicTerm[]> => {
    const params: Record<string, string> = {};
    if (academicYearId) params.academicYearId = String(academicYearId);
    const response = await apiClient.get<any>('/calendar/terms', params);
    return Array.isArray(response) ? response : (response?.terms || []);
  },

  createTerm: async (payload: Partial<AcademicTerm>): Promise<AcademicTerm> => {
    const response = await apiClient.post<any>('/calendar/terms', payload);
    return response?.term || response;
  },

  updateTerm: async (id: string, payload: Partial<AcademicTerm>): Promise<AcademicTerm> => {
    const response = await apiClient.put<any>(`/calendar/terms/${id}`, payload);
    return response?.term || response;
  },

  deleteTerm: async (id: string): Promise<void> => {
    await apiClient.delete(`/calendar/terms/${id}`);
  },

  /**
   * Bulk import events
   */
  importEvents: async (events: Partial<CalendarEvent>[]): Promise<{ imported: number; errors: any[] }> => {
    return apiClient.post<{ imported: number; errors: any[] }>('/calendar/import', { rows: events, events });
  },

  /**
   * Export URL helpers for RFC 5545 iCalendar sync
   */
  getIcsExportUrl: (startDate?: string, endDate?: string): string => {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `${baseUrl}/calendar/export?${params.toString()}`;
  },

  getEventIcsUrl: (eventId: string): string => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/calendar/${eventId}/ics`;
  },
};
