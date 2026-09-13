import { api } from './apiClient';

export interface VerifiedCertificate {
  serial_no: string;
  type: 'TC' | 'BONAFIDE';
  issued_at: string;
  school_name: string;
  student_name_masked: string;
  status: 'VALID' | 'REVOKED';
}

export interface CertificateVerifyResponse {
  success: boolean;
  valid: boolean;
  status: 'VALID' | 'REVOKED' | 'INVALID';
  certificate?: VerifiedCertificate;
  error?: string;
}

export interface AuditLogItem {
  id: string;
  source: 'general' | 'financial';
  timestamp: string;
  action: string;
  entity: string;
  entity_id: string;
  actor_name: string;
  actor_role: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface MissingDocumentStudent {
  student_id: string;
  admission_no: string;
  student_name: string;
  class_name: string;
  section_name: string;
  guardian_name: string;
  guardian_phone: string;
  missing_documents: Array<{ document_type: string; display_name: string }>;
  missing_count: number;
  submitted_count: number;
  required_count: number;
  compliance_pct: number;
}

export interface DocumentComplianceSummary {
  total_students: number;
  compliant_students: number;
  non_compliant_students: number;
  compliance_rate_pct: number;
  required_documents_count: number;
  required_documents: Array<{ document_type: string; display_name: string }>;
  by_class: Array<{
    class_name: string;
    missing_count: number;
    missing_students: Array<{ student_id: string; student_name: string; missing_count: number }>;
  }>;
}

export interface ActionCenterSummary {
  critical_count: number;
  needs_attention_count: number;
  informational_count: number;
  all_clear: boolean;
  empty_state_message: string | null;
}

export interface ActionCenterItem {
  id: string;
  category: string;
  severity?: 'CRITICAL' | 'NEEDS_ATTENTION' | 'INFORMATIONAL';
  title: string;
  description: string;
  count?: number;
  amount?: number;
  action_url?: string;
  action_label?: string;
}

export interface ActionCenterResponse {
  summary: ActionCenterSummary;
  sections: {
    critical: ActionCenterItem[];
    needs_attention: ActionCenterItem[];
    informational: ActionCenterItem[];
  };
  system_health: {
    transport: string;
    attendance: string;
    academics: string;
    finance: string;
    governance: string;
  };
  generated_at: string;
}

export const GovernanceService = {
  /** Public certificate verification */
  verifyCertificate: async (identifier: string, schoolId?: number): Promise<CertificateVerifyResponse> => {
    const url = `/certificates/verify/${encodeURIComponent(identifier)}${schoolId ? `?school_id=${schoolId}` : ''}`;
    return api.get<CertificateVerifyResponse>(url);
  },

  /** Forensic Audit Explorer logs */
  getAuditLogs: async (params: {
    fromDate?: string;
    toDate?: string;
    actorId?: string;
    entity?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: AuditLogItem[]; total: number }> => {
    const query = new URLSearchParams();
    if (params.fromDate) query.set('from_date', params.fromDate);
    if (params.toDate) query.set('to_date', params.toDate);
    if (params.actorId) query.set('actor_id', params.actorId);
    if (params.entity) query.set('entity', params.entity);
    if (params.action) query.set('action', params.action);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const res = await api.get<{ rows: AuditLogItem[]; total: number }>(`/audit-explorer?${query.toString()}`);
    return res || { rows: [], total: 0 };
  },

  /** Missing admission documents compliance summary */
  getDocumentComplianceSummary: async (): Promise<DocumentComplianceSummary> => {
    return api.get<DocumentComplianceSummary>('/students/documents/compliance-summary');
  },

  /** Missing admission documents list */
  getMissingDocumentList: async (params: { class_id?: string; section_id?: string; search?: string } = {}): Promise<MissingDocumentStudent[]> => {
    const query = new URLSearchParams();
    if (params.class_id) query.set('class_id', params.class_id);
    if (params.section_id) query.set('section_id', params.section_id);
    if (params.search) query.set('search', params.search);

    const res = await api.get<MissingDocumentStudent[]>(`/students/documents/missing-list?${query.toString()}`);
    return res || [];
  },

  /** Send reminder to guardian for missing admission documents */
  sendDocumentReminder: async (studentId: string, customMessage?: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>(`/students/documents/${studentId}/remind`, {
      custom_message: customMessage,
    });
  },

  /** Send reminders in batch to guardians of multiple students */
  batchSendDocumentReminders: async (
    studentIds: string[],
    customMessage?: string
  ): Promise<{ success: boolean; dispatched: number; total: number }> => {
    return api.post<{ success: boolean; dispatched: number; total: number }>('/students/documents/batch-remind', {
      student_ids: studentIds,
      custom_message: customMessage,
    });
  },

  /** Get school configured document requirements */
  getDocumentRequirements: async (): Promise<{ id: string; document_type: string; display_name: string; is_required: boolean }[]> => {
    const res = await api.get<{ id: string; document_type: string; display_name: string; is_required: boolean }[]>('/students/documents/requirements');
    return res || [];
  },

  /** Principal Action Center cockpit data */
  getActionCenterData: async (): Promise<ActionCenterResponse> => {
    return api.get<ActionCenterResponse>('/admin/action-center');
  },
};
