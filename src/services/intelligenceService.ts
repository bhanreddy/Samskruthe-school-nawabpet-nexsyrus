import { apiClient } from './apiClient';

export interface StudentInsight {
  id: string;
  title: string;
  summary: string;
  insight_type: 'GROWTH' | 'STRENGTH' | 'WATCH' | 'ATTENTION' | 'CRITICAL_REVIEW';
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
  rule_code: string;
  recommendations: string[];
  status: string;
  parent_visible: boolean;
  created_at: string;
  explanation_text?: string;
  bullet_points?: string[];
  baseline_comparison?: {
    attendance_baseline?: number;
    academic_baseline?: number;
    personal_observations?: Record<string, number>;
  };
  data_sources?: string[];
}

export interface StudentProfile {
  id: string;
  student_id: string;
  status_tier: 'STABLE' | 'WATCH' | 'ATTENTION' | 'GROWTH';
  attendance_rate_30d?: number;
  assessment_avg_recent?: number;
  total_anecdotes_positive: number;
  total_anecdotes_concern: number;
  active_insights_count: number;
  active_interventions_count: number;
  last_evaluated_at?: string;
}

export interface TeacherStudentCard {
  id: string;
  admission_no: string;
  roll_number?: number;
  display_name: string;
  photo_url?: string;
  class_name: string;
  section_name: string;
  class_section_id: string;
  status_tier: 'STABLE' | 'WATCH' | 'ATTENTION' | 'GROWTH';
  attendance_rate_30d?: number;
  assessment_avg_recent?: number;
  total_anecdotes_positive: number;
  total_anecdotes_concern: number;
  active_insights_count: number;
  active_interventions_count: number;
  followups_due_count: number;
}

export interface SchoolCockpitData {
  overview: {
    totalStudents: number;
    stableCount: number;
    watchCount: number;
    attentionCount: number;
    growthCount: number;
  };
  today: {
    emergingPatterns: number;
    studentStrengths: number;
    itemsRequiringReview: number;
    followupsDue: number;
    activeInterventions: number;
  };
  classTrends: Array<{
    class_section_id: string;
    class_name: string;
    section_name: string;
    student_count: number;
    avg_attendance_rate: number;
    avg_assessment_score: number;
    attention_students_count: number;
    growth_students_count: number;
    class_id?: string;
    section_id?: string;
    attendance_rate?: number;
    homework_rate?: number;
    academic_trend?: string;
    observation_count?: number;
    total_students?: number;
    attention_count?: number;
    growth_count?: number;
  }>;
  reviewQueue: Array<{
    id: string;
    title: string;
    summary: string;
    insight_type: string;
    confidence: string;
    created_at: string;
    student_name: string;
    student_photo_url?: string;
    admission_no: string;
    class_name: string;
    section_name: string;
  }>;
  student_tiers?: {
    total: number;
    stable: number;
    watch: number;
    attention: number;
    growth: number;
  };
  today_intelligence?: {
    emerging_patterns: number;
    student_strengths: number;
    class_trends: number;
    follow_ups_due: number;
    items_requiring_review: number;
  };
}

export type IntelligenceInsight = StudentInsight & {
  category?: string;
  severity?: string;
  explanation_bullets?: string[];
  baseline_context?: any;
  supporting_signals?: any[];
  recommended_actions?: any[];
  student_id?: string;
};
export type TeacherCockpitStudent = TeacherStudentCard & {
  student_id?: string;
  name?: string;
  severity?: string;
  latest_insight?: IntelligenceInsight;
};
export type ClassIntelligenceSummary = SchoolCockpitData['classTrends'][0];

export interface StudentIntervention {
  id: string;
  student_id: string;
  student_name?: string;
  student_photo_url?: string;
  admission_no?: string;
  insight_id?: string;
  action_type: string;
  title: string;
  description: string;
  start_date: string;
  target_date?: string;
  follow_up_date?: string;
  status: 'RECOMMENDED' | 'ACCEPTED' | 'IN_PROGRESS' | 'FOLLOW_UP' | 'COMPLETED' | 'OUTCOME_RECORDED' | 'CANCELLED';
  outcome_status?: 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'INCONCLUSIVE';
  outcome_notes?: string;
  baseline_metric?: Record<string, any>;
  outcome_metric?: Record<string, any>;
  creator_name?: string;
  assigned_to_name?: string;
  created_at: string;
}

export const IntelligenceService = {
  /**
   * Get student insights with "Why?" explanations
   */
  async getStudentInsights(studentId: string): Promise<{ insights: StudentInsight[] }> {
    return apiClient.get(`/intelligence/students/${studentId}/insights`);
  },

  /**
   * Get student personal baseline
   */
  async getStudentBaseline(studentId: string, windowDays = 60): Promise<any> {
    return apiClient.get(`/intelligence/students/${studentId}/baseline?window_days=${windowDays}`);
  },

  /**
   * Trigger recalculation of student signals, patterns, and insights
   */
  async evaluateStudent(studentId: string): Promise<any> {
    return apiClient.post(`/intelligence/evaluate/${studentId}`);
  },

  async getStudentSignals(studentId: string): Promise<{ signals: any[] }> {
    return apiClient.get(`/intelligence/students/${studentId}/signals`);
  },

  async reviewInsight(insightId: string, payload: { status: 'ACKNOWLEDGED' | 'DISMISSED' | 'ACTIVE'; dismissed_reason?: string }) {
    return apiClient.patch(`/intelligence/insights/${insightId}`, payload);
  },

  async getMyProgress(): Promise<{ student_id: string; timeline: { items: any[] }; insights: StudentInsight[] }> {
    return apiClient.get('/intelligence/me/progress');
  },

  /**
   * Principal & School Admin Intelligence Cockpit
   */
  async getSchoolCockpit(): Promise<SchoolCockpitData> {
    return apiClient.get('/intelligence/school');
  },

  /**
   * Class Intelligence drilldown
   */
  async getClassIntelligence(classSectionId: string): Promise<any> {
    return apiClient.get(`/intelligence/classes/${classSectionId}`);
  },

  /**
   * Teacher "My Students" Intelligence overview
   */
  async getTeacherStudentsIntelligence(classSectionId?: string): Promise<{
    summary: {
      total: number;
      stable: number;
      watch: number;
      attention: number;
      growth: number;
    };
    students: TeacherStudentCard[];
  }> {
    const qs = classSectionId ? `?class_section_id=${classSectionId}` : '';
    return apiClient.get(`/intelligence/teacher/my-students${qs}`);
  },

  /**
   * List interventions
   */
  async getInterventions(params: {
    student_id?: string;
    class_section_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: StudentIntervention[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams();
    if (params.student_id) query.set('student_id', params.student_id);
    if (params.class_section_id) query.set('class_section_id', params.class_section_id);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return apiClient.get(`/interventions${qs ? `?${qs}` : ''}`);
  },

  /**
   * Create an intervention
   */
  async createIntervention(payload: {
    student_id: string;
    insight_id?: string;
    signal_id?: string;
    action_type?: string;
    title: string;
    description?: string;
    start_date?: string;
    target_date?: string;
    follow_up_date?: string;
    assigned_to?: string;
    baseline_metric?: Record<string, any>;
  }): Promise<StudentIntervention> {
    return apiClient.post('/interventions', payload);
  },

  /**
   * Record before vs after outcome
   */
  async recordOutcome(interventionId: string, payload: {
    outcome_status: 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'INCONCLUSIVE';
    outcome_notes?: string;
    after_metric?: Record<string, any>;
  }): Promise<StudentIntervention> {
    return apiClient.post(`/interventions/${interventionId}/outcome`, payload);
  },
};

export const SchoolIntelligenceService = {
  ...IntelligenceService,
  async getClassBreakdown(): Promise<ClassIntelligenceSummary[]> {
    const res = await IntelligenceService.getSchoolCockpit();
    return (res?.classTrends as any) || [];
  },
  async getTeacherCockpit(classSectionId?: string) {
    return IntelligenceService.getTeacherStudentsIntelligence(classSectionId);
  },
};

export const InterventionService = {
  ...IntelligenceService,
  async recordOutcome(id: string, payload: any) {
    return IntelligenceService.recordOutcome(id, {
      outcome_status: payload.outcome_rating || payload.outcome_status || 'EFFECTIVE',
      outcome_notes: payload.outcome_notes,
      after_metric: payload.metrics_after || payload.after_metric,
    });
  },
};

