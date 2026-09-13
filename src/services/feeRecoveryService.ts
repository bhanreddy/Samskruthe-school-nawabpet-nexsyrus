import { api } from './apiClient';

export interface AgeingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface FeeRecoverySummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  collection_efficiency: number;
  outstanding_students_count: number;
  reminders_sent_30d: number;
}

export interface FeeRecoveryOverview {
  school_id: number;
  summary: FeeRecoverySummary;
  ageing_buckets: {
    current: AgeingBucket;
    days_1_7: AgeingBucket;
    days_8_30: AgeingBucket;
    days_31_60: AgeingBucket;
    days_61_90: AgeingBucket;
    days_90_plus: AgeingBucket;
  };
  class_breakdown: {
    class_id: string;
    class_name: string;
    defaulters_count: number;
    outstanding_amount: number;
  }[];
  generated_at: string;
}

export type SegmentationType = 'new' | 'repeat' | 'persistent';

export interface FeeDefaulterItem {
  student_id: string;
  admission_no: string;
  student_name: string;
  class_name: string;
  section_name: string;
  class_id: string;
  section_id: string;
  total_outstanding: number;
  total_due?: number;
  total_paid?: number;
  paid_percentage?: number;
  oldest_due_date: string;
  days_overdue: number;
  overdue_fees_count: number;
  segmentation: SegmentationType;
  ageing_stage: string;
  parent_contact?: {
    parent_name?: string;
    phone?: string;
  };
  last_payment?: {
    amount: number;
    paid_at: string;
    receipt_no?: string;
  };
  last_reminder?: {
    sent_at: string;
    stage: string;
    channel: string;
  };
  reminder_count: number;
}

export interface FeeDefaultersResponse {
  data: FeeDefaulterItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface AutomationRuleConfig {
  id?: string | null;
  school_id: number;
  rule_key: string;
  is_enabled: boolean;
  trigger_config: {
    days_before_due: number;
    overdue_stages: number[];
    cooldown_days: number;
  };
  action_config: {
    channel: string;
    template: string;
  };
}

export interface SendRemindersDryRunResult {
  dry_run: true;
  selected_students_count: number;
  eligible_students_count: number;
  total_outstanding: number;
  channel: string;
  sample_message: string;
}

export interface SendRemindersSuccessResult {
  requested_count: number;
  eligible_count: number;
  dispatched_count: number;
  skipped_count: number;
  skipped_details?: { studentId: string; studentName?: string; reason: string }[];
  error_count: number;
  errors: { studentId: string; error: string }[];
}

export const FeeRecoveryService = {
  /**
   * Fetch overview metrics: totals, collection efficiency, and ageing buckets.
   */
  async getOverview(academicYearId?: string): Promise<FeeRecoveryOverview> {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const res = await api.get('/fees/recovery/overview', params);
    return res as FeeRecoveryOverview;
  },

  /**
   * Fetch list of defaulters with segmentation and contact info.
   */
  async getDefaulters(params: {
    class_id?: string;
    section_id?: string;
    ageing_stage?: string;
    segmentation?: string;
    search?: string;
    min_paid_percent?: number;
    max_paid_percent?: number;
    page?: number;
    limit?: number;
  } = {}): Promise<FeeDefaultersResponse> {
    const res = await api.get('/fees/recovery/defaulters', params);
    return res as FeeDefaultersResponse;
  },

  /**
   * Get current fee reminder automation rules.
   */
  async getRules(): Promise<AutomationRuleConfig> {
    const res = await api.get('/fees/recovery/rules');
    return res as AutomationRuleConfig;
  },

  /**
   * Update fee reminder automation rules.
   */
  async updateRules(updates: Partial<AutomationRuleConfig>): Promise<AutomationRuleConfig> {
    const res = await api.put('/fees/recovery/rules', updates);
    return res as AutomationRuleConfig;
  },

  /**
   * Preview reminder dispatch (dry run).
   */
  async previewReminders(studentIds: string[], customMessage?: string): Promise<SendRemindersDryRunResult> {
    const res = await api.post('/fees/recovery/remind', {
      student_ids: studentIds,
      custom_message: customMessage,
      dry_run: true,
    });
    return res as SendRemindersDryRunResult;
  },

  /**
   * Execute manual fee reminder dispatch.
   */
  async sendReminders(studentIds: string[], customMessage?: string): Promise<SendRemindersSuccessResult> {
    const res = await api.post('/fees/recovery/remind', {
      student_ids: studentIds,
      custom_message: customMessage,
      dry_run: false,
    });
    return res as SendRemindersSuccessResult;
  },

  /**
   * Fetch reminder history logs.
   */
  async getReminderHistory(studentId?: string, page = 1, limit = 50): Promise<any[]> {
    const params: Record<string, any> = { page, limit };
    if (studentId) params.student_id = studentId;
    const res = await api.get('/fees/recovery/reminders/history', params);
    return res as any[];
  },
};
