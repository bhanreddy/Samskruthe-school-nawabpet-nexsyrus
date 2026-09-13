import { apiClient } from './apiClient';
import type {
  AdmissionApplication,
  WorkflowStage,
  DocumentRequirement,
  DocumentChecklistSummary,
  AdmissionTask,
  AdmissionInterview,
  AdmissionNote,
  AdmissionCommunication,
  AdmissionAuditLog,
  AdmissionAnalyticsData,
  SmartNextAction,
} from '../types/admission';

export interface PublicFormConfigResponse {
  school: { id: number; name: string; code: string };
  classes: Array<{ id: string; name: string }>;
  academicYear: { id: string; name: string; start_date: string; end_date: string } | null;
  documentRequirements: DocumentRequirement[];
  workflowStages: WorkflowStage[];
  settings: {
    is_admission_open: boolean;
    application_fee: number;
    allow_online_payment?: boolean;
  };
}

export interface DuplicateCheckResult {
  isPotentialDuplicate: boolean;
  matchCount: number;
  matches: Array<{
    id: string;
    entityType: 'APPLICATION' | 'ENROLLED_STUDENT';
    matchType: string;
    confidence: string;
    applicationNo?: string;
    admissionNo?: string;
    studentName: string;
    className?: string;
    status?: string;
    createdAt?: string;
    details: string;
  }>;
}

export interface MyApplicationResponse {
  application: AdmissionApplication;
  documentChecklist: DocumentChecklistSummary;
  interviews: AdmissionInterview[];
  messages: AdmissionCommunication[];
  timeline: Array<{
    id: string;
    from_status?: string;
    to_status: string;
    remarks?: string;
    entered_at: string;
    stage_name?: string;
  }>;
  workflowTimeline?: Array<{
    code: string;
    name: string;
    color?: string;
    state: 'done' | 'current' | 'upcoming';
    entered_at?: string;
    remarks?: string;
  }>;
  progressPercent?: number;
  smartNextAction: SmartNextAction;
}

export interface PipelineStageGroup {
  stageId: string;
  stageCode: string;
  stageName: string;
  sequenceOrder: number;
  color: string;
  count: number;
  applications: AdmissionApplication[];
}

export interface PipelineResponse {
  pipeline: PipelineStageGroup[];
  totalCount: number;
  slaBreachedCount: number;
}

export interface ApplicationDetailResponse {
  application: AdmissionApplication;
  documents: DocumentChecklistSummary;
  interviews: AdmissionInterview[];
  tasks: AdmissionTask[];
  notes: AdmissionNote[];
  communications: AdmissionCommunication[];
  auditLogs: AdmissionAuditLog[];
  conversionReadiness: {
    ready: boolean;
    errors: string[];
  };
}

export const admissionService = {
  // Public
  async getPublicFormConfig(): Promise<PublicFormConfigResponse> {
    const res: any = await apiClient.get('/admissions/public/form-config');
    return res.data || res;
  },

  async checkDuplicate(payload: {
    phone?: string;
    email?: string;
    studentFirstName?: string;
    studentLastName?: string;
    dob?: string;
    tcNumber?: string;
  }): Promise<DuplicateCheckResult> {
    const res: any = await apiClient.post('/admissions/public/duplicate-check', payload);
    return res.data || res;
  },

  async resolveIdentifier(identifier: string): Promise<{ resolvedEmail: string; applicationNumber?: string; enquiryNumber?: string }> {
    const res: any = await apiClient.post('/admissions/public/resolve-identifier', { identifier });
    return res.data || res;
  },

  async submitEnquiry(payload: {
    parent_name: string;
    student_name: string;
    phone: string;
    email?: string;
    interested_class_id?: string;
    academic_year_id?: string;
    source?: string;
    notes?: string;
    create_applicant_account?: boolean;
    password?: string;
    force_new?: boolean;
  }): Promise<any> {
    const res: any = await apiClient.post('/admissions/public/enquiry', payload);
    return res.data || res;
  },

  // Applicant Portal
  async getMyApplication(): Promise<MyApplicationResponse> {
    const res: any = await apiClient.get('/admissions/my-application');
    return res.data || res;
  },

  async updateMyApplication(data: Partial<AdmissionApplication>): Promise<any> {
    const res: any = await apiClient.put('/admissions/my-application', data);
    return res.data || res;
  },

  async submitMyApplication(): Promise<any> {
    const res: any = await apiClient.post('/admissions/my-application/submit', {});
    return res.data || res;
  },

  async uploadMyDocument(payload: {
    documentType: string;
    title?: string;
    base64?: string;
    fileName?: string;
    mimeType?: string;
  }): Promise<any> {
    const res: any = await apiClient.post('/admissions/my-application/documents', payload);
    return res.data || res;
  },

  // Staff & Admin
  async getPipeline(params: {
    classId?: string;
    academicYearId?: string;
    search?: string;
  } = {}): Promise<PipelineResponse> {
    const query = new URLSearchParams();
    if (params.classId) query.set('classId', params.classId);
    if (params.academicYearId) query.set('academicYearId', params.academicYearId);
    if (params.search) query.set('search', params.search);

    const url = `/admissions/pipeline${query.toString() ? `?${query.toString()}` : ''}`;
    const res: any = await apiClient.get(url);
    return res.data || res;
  },

  async getApplications(params: {
    classId?: string;
    status?: string;
    search?: string;
    priority?: string;
    isSlaBreached?: boolean;
    decision?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ applications: AdmissionApplication[]; total: number }> {
    const query = new URLSearchParams();
    if (params.classId) query.set('classId', params.classId);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.priority) query.set('priority', params.priority);
    if (params.isSlaBreached !== undefined) query.set('isSlaBreached', String(params.isSlaBreached));
    if (params.decision) query.set('decision', params.decision);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const url = `/admissions/applications${query.toString() ? `?${query.toString()}` : ''}`;
    const res: any = await apiClient.get(url);
    return res.data || res;
  },

  async getApplicationDetail(id: string): Promise<ApplicationDetailResponse> {
    const res: any = await apiClient.get(`/admissions/applications/${id}`);
    return res.data || res;
  },

  async transitionStage(id: string, targetStatus: string, remarks = '', isOverride = false): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/transition`, {
      targetStatus,
      remarks,
      isOverride,
    });
    return res.data || res;
  },

  async verifyDocument(id: string, payload: {
    documentId: string;
    status: 'VERIFIED' | 'REJECTED';
    rejectionReason?: string;
    replacementRequested?: boolean;
  }): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/verify-document`, payload);
    return res.data || res;
  },

  async scheduleInterview(id: string, payload: {
    interviewType: string;
    title: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    location?: string;
    mode?: 'OFFLINE' | 'ONLINE';
    onlineMeetingUrl?: string;
    interviewerId?: string;
  }): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/schedule-interview`, payload);
    return res.data || res;
  },

  async evaluateInterview(id: string, payload: {
    interviewId: string;
    rubricScores: Record<string, number>;
    recommendation: string;
    feedback?: string;
  }): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/evaluate-interview`, payload);
    return res.data || res;
  },

  async makeDecision(id: string, payload: {
    decision: 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'WAITLISTED' | 'REJECTED';
    decisionReason?: string;
    conditionalRequirements?: string;
  }): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/decision`, payload);
    return res.data || res;
  },

  async convertToStudent(id: string, payload: {
    custom_admission_no?: string;
    section_id?: string;
    roll_number?: number;
    admission_date?: string;
  } = {}): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/convert`, payload);
    return res.data || res;
  },

  async addNote(id: string, note: string, priority = 'NORMAL'): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/notes`, { note, priority });
    return res.data || res;
  },

  async sendMessage(id: string, subject: string, message: string): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/messages`, { subject, message });
    return res.data || res;
  },

  async sendMyMessage(subject: string, message: string): Promise<any> {
    const res: any = await apiClient.post('/admissions/my-application/messages', { subject, message });
    return res.data || res;
  },

  async withdrawMyApplication(reason?: string): Promise<any> {
    const res: any = await apiClient.post('/admissions/my-application/withdraw', { reason });
    return res.data || res;
  },

  async bulkAction(payload: { ids: string[]; action: string; confirm: boolean; targetStatus?: string; assignedStaffId?: string; remarks?: string }): Promise<any> {
    const res: any = await apiClient.post('/admissions/applications/bulk', payload);
    return res.data || res;
  },

  async markFeePaid(id: string, remarks?: string): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/fee-paid`, { remarks });
    return res.data || res;
  },

  async mergeApplications(primaryId: string, sourceApplicationId: string): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${primaryId}/merge`, {
      sourceApplicationId,
      confirm: true,
    });
    return res.data || res;
  },

  async promoteWaitlist(id: string, reason?: string): Promise<any> {
    const res: any = await apiClient.post(`/admissions/applications/${id}/waitlist/promote`, { reason });
    return res.data || res;
  },

  async exportCsv(type = 'applications'): Promise<void> {
    await apiClient.downloadFile(
      `/admissions/export?type=${encodeURIComponent(type)}`,
      `admissions-${type}.csv`,
    );
  },

  async getAnalytics(academicYearId?: string): Promise<AdmissionAnalyticsData> {
    const url = `/admissions/analytics${academicYearId ? `?academicYearId=${academicYearId}` : ''}`;
    const res: any = await apiClient.get(url);
    return res.data || res;
  },

  async getSettings(): Promise<any> {
    const res: any = await apiClient.get('/admissions/settings');
    return res.data || res;
  },

  async updateSettings(payload: any): Promise<any> {
    const res: any = await apiClient.put('/admissions/settings', payload);
    return res.data || res;
  },
};
