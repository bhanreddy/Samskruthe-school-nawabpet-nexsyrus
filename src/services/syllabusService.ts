import { api } from './apiClient';

export type SyllabusStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
export type SyllabusHealth = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'PLANNING_INCOMPLETE';

export interface SyllabusTopic {
  id: string;
  chapter_id: string;
  topic_number: number;
  title: string;
  target_date?: string | null;
  status: SyllabusStatus;
  completed_at?: string | null;
}

export interface SyllabusChapter {
  id: string;
  school_id: number;
  academic_year_id?: string | null;
  class_id: string;
  subject_id: string;
  term: string;
  chapter_number: number;
  title: string;
  estimated_periods: number;
  target_completion_date?: string | null;
  status: SyllabusStatus;
  topics?: SyllabusTopic[];
}

export interface SyllabusOverviewItem {
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  teacher_name: string;
  total_topics: number;
  completed_topics: number;
  expected_due_topics: number;
  actual_pct: number;
  expected_pct: number | null;
  variance_pct: number | null;
  status: SyllabusHealth;
  status_label: string;
  topics_behind: number;
  delay_days: null;
  planning_incomplete: boolean;
}

export interface TeacherSyllabusSummary {
  current_chapter: string;
  next_topic: string;
  target_date: string | null;
  actual_pct: number;
  expected_pct: number | null;
  status: SyllabusHealth;
  status_label: string;
  topics_behind: number;
  delay_days: null;
}

export const SyllabusService = {
  async getStructure(classId: string, subjectId: string, academicYearId?: string): Promise<SyllabusChapter[]> {
    const res = await api.get<SyllabusChapter[]>('/syllabus/structure', {
      class_id: classId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
    }, { silent: true });
    return Array.isArray(res) ? res : [];
  },

  async createChapter(payload: {
    class_id: string;
    subject_id: string;
    chapter_number: number;
    title: string;
    term?: string;
    estimated_periods?: number;
    target_completion_date?: string;
  }): Promise<SyllabusChapter> {
    return api.post<SyllabusChapter>('/syllabus/chapters', payload);
  },

  async createTopic(payload: {
    chapter_id: string;
    topic_number: number;
    title: string;
    target_date?: string;
  }): Promise<SyllabusTopic> {
    return api.post<SyllabusTopic>('/syllabus/topics', payload);
  },

  async getCoordinatorOverview(): Promise<SyllabusOverviewItem[]> {
    const res = await api.get<SyllabusOverviewItem[]>('/syllabus/overview', undefined, { silent: true });
    return Array.isArray(res) ? res : [];
  },

  async getTeacherSummary(classId: string, subjectId: string): Promise<TeacherSyllabusSummary | null> {
    const res = await api.get<TeacherSyllabusSummary>('/syllabus/teacher-summary', {
      class_id: classId,
      subject_id: subjectId,
    }, { silent: true });
    return res || null;
  },
};
