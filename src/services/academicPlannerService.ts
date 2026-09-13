import { api } from './apiClient';

export type AcademicHealth =
  | 'AHEAD'
  | 'ON_TRACK'
  | 'SLIGHT_DELAY'
  | 'AT_RISK'
  | 'CRITICAL'
  | 'COMPLETED';

export interface Curriculum {
  id: string;
  name: string;
  version: number;
  status: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  class_name?: string;
  subject_name?: string;
  units?: CurriculumUnit[];
}

export interface CurriculumUnit {
  id: string;
  title: string;
  sequence: number;
  estimated_periods: number;
  term_id?: string;
  chapters?: CurriculumChapter[];
}

export interface CurriculumChapter {
  id: string;
  title: string;
  sequence: number;
  estimated_periods: number;
  topics?: CurriculumTopic[];
}

export interface CurriculumTopic {
  id: string;
  title: string;
  sequence: number;
  estimated_periods: number;
  is_optional?: boolean;
}

export interface AcademicPlan {
  id: string;
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  teacher_name?: string;
  status: string;
  actual_progress?: number;
  expected_progress?: number;
  variance?: number;
  health_status?: AcademicHealth;
  current_velocity?: number;
  required_velocity?: number;
  projected_completion_date?: string;
  projected_delay_days?: number;
  planned_start_date?: string;
  planned_end_date?: string;
  target_completion_date?: string;
  items?: AcademicPlanItem[];
}

export interface AcademicPlanItem {
  id: string;
  sequence: number;
  status: string;
  planned_start_date?: string;
  planned_end_date?: string;
  planned_periods: number;
  topic_title?: string;
  chapter_title?: string;
  curriculum_topic_id: string;
}

export interface CommandCenterSummary {
  total_plans: number;
  overall_actual_completion: number;
  overall_expected_completion: number;
  average_variance: number;
  overall_health: string;
  counts: {
    on_track: number;
    slight_delay: number;
    at_risk: number;
    critical: number;
    completed: number;
  };
}

export interface AcademicToday {
  has_classes_today: boolean;
  date: string;
  current_slot?: any;
  scheduled_slots?: any[];
  assigned_plans?: any[];
}

export interface ParentAcademicSummary {
  class_name?: string;
  section_name?: string;
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    term_progress: number;
    currently_learning: string;
    recently_completed: string;
    coming_next: string;
  }>;
}

export const AcademicPlannerService = {
  getCommandCenter(academicYearId?: string) {
    return api.get<CommandCenterSummary>('/academics/dashboard', { academic_year_id: academicYearId }, { silent: true });
  },
  getDrilldown(params: Record<string, string | undefined> = {}) {
    return api.get<any[]>('/academics/drilldown', params, { silent: true });
  },
  getCrossSection(academicYearId?: string, classId?: string) {
    return api.get<any[]>('/academics/cross-section', { academic_year_id: academicYearId, class_id: classId }, { silent: true });
  },
  listCurricula(params: Record<string, string | undefined> = {}) {
    return api.get<Curriculum[]>('/academics/curricula', params, { silent: true });
  },
  getCurriculum(id: string) {
    return api.get<Curriculum>(`/academics/curricula/${id}`, undefined, { silent: true });
  },
  createCurriculum(data: Record<string, unknown>) {
    return api.post<Curriculum>('/academics/curricula', data);
  },
  createUnit(curriculumId: string, data: Record<string, unknown>) {
    return api.post(`/academics/curricula/${curriculumId}/units`, data);
  },
  createChapter(curriculumId: string, data: Record<string, unknown>) {
    return api.post(`/academics/curricula/${curriculumId}/chapters`, data);
  },
  createTopic(chapterId: string, data: Record<string, unknown>) {
    return api.post(`/academics/curricula/chapters/${chapterId}/topics`, data);
  },
  copyCurriculum(id: string, targetAcademicYearId: string) {
    return api.post(`/academics/curricula/${id}/copy`, { target_academic_year_id: targetAcademicYearId });
  },
  previewImport(formData: FormData) {
    return api.post('/academics/import/preview', formData as any);
  },
  commitImport(data: { academic_year_id: string; rows: any[] }) {
    return api.post('/academics/import/commit', data);
  },
  listPlans(params: Record<string, string | undefined> = {}) {
    return api.get<AcademicPlan[]>('/academics/plans', params, { silent: true });
  },
  getPlan(id: string) {
    return api.get<AcademicPlan>(`/academics/plans/${id}`, undefined, { silent: true });
  },
  createPlan(data: Record<string, unknown>) {
    return api.post<AcademicPlan>('/academics/plans', data);
  },
  generatePlan(id: string) {
    return api.post(`/academics/plans/${id}/generate`, {});
  },
  submitPlan(id: string) {
    return api.post(`/academics/plans/${id}/submit`, {});
  },
  reviewPlan(id: string, action: string, remarks?: string) {
    return api.post(`/academics/plans/${id}/approve`, { action, remarks });
  },
  getToday(params?: Record<string, string>) {
    return api.get<AcademicToday>('/academics/today', params, { silent: true });
  },
  recordProgress(planId: string, data: Record<string, unknown>) {
    return api.post(`/academics/plans/${planId}/progress`, data, { silent: true });
  },
  getDiaryTopic(planItemId: string) {
    return api.get(`/academics/today/diary-topic/${planItemId}`, undefined, { silent: true });
  },
  listRisks(academicYearId?: string) {
    return api.get<any[]>('/academics/risks', { academic_year_id: academicYearId }, { silent: true });
  },
  scanRisks(academicYearId?: string) {
    return api.post('/academics/risks/scan', { academic_year_id: academicYearId });
  },
  generateRecovery(planId: string, riskEventId?: string) {
    return api.post('/academics/recovery-plans/generate', { plan_id: planId, risk_event_id: riskEventId });
  },
  approveRecovery(id: string, selectedOption: string) {
    return api.post(`/academics/recovery-plans/${id}/approve`, { selected_option: selectedOption });
  },
  getWeeklyReport(academicYearId?: string) {
    return api.get('/academics/reports/weekly', { academic_year_id: academicYearId }, { silent: true });
  },
  getParentSummary(studentId?: string) {
    return api.get<ParentAcademicSummary>('/academics/parent-summary', studentId ? { student_id: studentId } : {}, { silent: true });
  },
  getSettings() {
    return api.get('/academics/settings', undefined, { silent: true });
  },
  updateSettings(data: Record<string, unknown>) {
    return api.put('/academics/settings', data);
  },
};
