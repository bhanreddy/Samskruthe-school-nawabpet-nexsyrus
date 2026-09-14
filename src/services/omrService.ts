/**
 * SchoolIMS — Premium OMR Engine Client Service
 * Connects frontend screens to backend OMR Engine endpoints.
 */

import { api } from './apiClient';

export interface OmrTemplate {
  id: string;
  name: string;
  code: string;
  layout_type?: 'portrait' | 'landscape';
  page_size?: string;
  total_questions: number;
  options_per_question: number;
  has_roll_number_grid?: boolean;
  roll_number_digits?: number;
  has_qr_header?: boolean;
  is_system?: boolean;
  description?: string;
  version?: number;
  geometry?: any;
}

export interface OmrExam {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'evaluating' | 'finalized' | 'archived' | string;
  positive_marks_per_question?: number;
  negative_marks_per_question?: number;
  confidence_threshold?: number;
  exam_subject_id?: string;
  max_marks?: number;
  subject_name?: string;
  class_name?: string;
  exam_name?: string;
  template_name?: string;
  total_questions?: number;
  question_count?: number;
  options_per_question?: number;
  template?: OmrTemplate;
  marking_scheme?: {
    positive: number;
    negative: number;
    blank: number;
  };
  total_scans?: number;
  finalized_scans?: number;
  pending_reviews?: number;
}

export interface OmrAnswerKeyQuestion {
  question_number: number;
  correct_option: string;
  weight?: number;
  weightage?: number;
  negative_weightage?: number;
}

export interface OmrAnswerKey {
  id: string;
  version: number;
  version_number?: number;
  status: 'draft' | 'published' | 'superseded' | 'PUBLISHED' | 'DRAFT' | string;
  published_at?: string;
  questions: OmrAnswerKeyQuestion[];
}

export interface OmrScanAnswer {
  id: string;
  question_number: number;
  detected_option: string | null;
  fill_status: string;
  confidence_score: number;
  is_flagged: boolean;
  is_manually_verified?: boolean;
  marks_awarded?: number;
}

export interface OmrScan {
  id: string;
  sheet_id: string;
  omr_exam_id?: string;
  batch_id?: string;
  student_id?: string;
  roll_number_detected?: number | null;
  status: 'SCANNED' | 'PROCESSING' | 'PROCESSED' | 'REVIEW_REQUIRED' | 'VERIFIED' | 'FINALIZED' | string;
  confidence_score: number;
  is_flagged: boolean;
  correct_count?: number;
  wrong_count?: number;
  blank_count?: number;
  final_score?: number;
  answers?: OmrScanAnswer[];
  created_at?: string;
}

export interface OmrReviewItem {
  id: string;
  scan_id: string;
  question_number?: number;
  exception_type: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  resolved_option?: string;
  resolved_by?: string;
  created_at?: string;
}

export interface OmrBatch {
  id: string;
  batch_number: string;
  total_sheets: number;
  status: string;
  created_at: string;
}

export interface OmrAnalyticsReport {
  summary: {
    total_sheets: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
  };
  question_statistics: Array<{
    question_number: number;
    correct_percentage: number;
    difficulty_level: string;
    option_distribution: Record<string, number>;
  }>;
}

export interface OmrAuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: any;
  created_at: string;
}

export interface OmrScanResult {
  scanId: string;
  sheetId: string;
  status: string;
  overallConfidence: number;
  detectedRollNumber: number | null;
  student?: {
    first_name: string;
    last_name: string;
    admission_no: string;
  };
  evaluation: {
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    blankCount: number;
    multipleCount: number;
  };
  quality: {
    status: 'GOOD' | 'WARNING' | 'REJECT';
    guidance: string;
  };
  answers: Array<{
    questionNumber: number;
    detectedOption: string;
    effectiveOption: string;
    confidence: number;
    isCorrect: boolean;
    marksAwarded: number;
  }>;
}

export interface OmrExceptionItem {
  scan_id: string;
  sheet_id: string;
  omr_exam_id: string;
  detected_roll_number: number | null;
  student_enrollment_id: string | null;
  overall_confidence: number;
  exception_type: string;
  created_at: string;
  exam_title: string;
  first_name?: string;
  last_name?: string;
  admission_no?: string;
  review_items_count: number;
}

function unwrapOmr<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && (res.success === true || res.data !== undefined)) {
    return res.data as T;
  }
  return res as T;
}

function unwrapOmrList<T>(res: any): T[] {
  const data = unwrapOmr<T[]>(res);
  return Array.isArray(data) ? data : [];
}

export const omrService = {
  async getTemplates(): Promise<{ success: boolean; data: OmrTemplate[] }> {
    const res = await api.get<any>('/omr/templates');
    return { success: true, data: unwrapOmrList<OmrTemplate>(res) };
  },

  async getPapers(): Promise<{ success: boolean; data: Array<{
    id: string;
    exam_id: string;
    exam_name: string;
    subject_name: string;
    class_name: string;
    max_marks: number;
    academic_year: string;
    has_omr: boolean;
  }> }> {
    const res = await api.get<any>('/omr/papers');
    return { success: true, data: unwrapOmrList(res) };
  },

  async startBatch(payload: { omr_exam_id: string; name?: string; device_id?: string }): Promise<{ success: boolean; data: OmrBatch }> {
    const res = await api.post<any>('/omr/batches', payload);
    return { success: true, data: unwrapOmr<OmrBatch>(res) };
  },

  async getScan(id: string): Promise<{ success: boolean; data: OmrScan }> {
    const res = await api.get<any>(`/omr/scans/${id}`);
    const scan = unwrapOmr<any>(res);
    return {
      success: true,
      data: {
        ...scan,
        student_id: scan.student_enrollment_id,
        roll_number_detected: scan.detected_roll_number,
        confidence_score: Number(scan.overall_confidence || 0),
        is_flagged: scan.status === 'REVIEW_REQUIRED',
        final_score: scan.total_score,
        answers: (scan.answers || []).map((a: any) => ({
          ...a,
          fill_status: a.is_multiple ? 'MULTIPLE' : a.is_blank ? 'BLANK' : a.is_ambiguous ? 'AMBIGUOUS' : 'FILLED',
          confidence_score: Number(a.confidence || 0),
          is_flagged: a.is_ambiguous || a.is_multiple || Number(a.confidence || 100) < 70,
        })),
      },
    };
  },

  async getTemplate(id: string): Promise<{ success: boolean; data: OmrTemplate & { calculatedGeometry: any } }> {
    const res = await api.get<any>(`/omr/templates/${id}`);
    return { success: true, data: unwrapOmr(res) };
  },

  async getExams(params?: { limit?: number; status?: string }): Promise<{ success: boolean; data: OmrExam[] }> {
    const query = params?.limit ? `?limit=${params.limit}` : '';
    const res = await api.get<any>(`/omr/exams${query}`);
    return { success: true, data: unwrapOmrList<OmrExam>(res) };
  },

  async getExam(id: string): Promise<{ success: boolean; data: OmrExam & { activeAnswerKey: OmrAnswerKey | null } }> {
    const res = await api.get<any>(`/omr/exams/${id}`);
    return { success: true, data: unwrapOmr(res) };
  },

  async createExam(payload: {
    exam_subject_id?: string;
    template_id: string;
    title: string;
    question_count?: number;
    positive_marks?: number;
    negative_marks?: number;
    blank_marks?: number;
    marking_scheme?: {
      positive: number;
      negative: number;
      blank: number;
    };
    multiple_answer_policy?: string;
    multiple_answer_behavior?: string;
    confidence_threshold?: number;
    review_threshold?: number;
  }): Promise<{ success: boolean; data: OmrExam }> {
    const body = {
      exam_subject_id: payload.exam_subject_id,
      template_id: payload.template_id,
      title: payload.title,
      positive_marks: payload.marking_scheme?.positive ?? payload.positive_marks,
      negative_marks: payload.marking_scheme?.negative ?? payload.negative_marks,
      blank_marks: payload.marking_scheme?.blank ?? payload.blank_marks,
      multiple_answer_behavior: payload.multiple_answer_behavior || (payload.multiple_answer_policy === 'MARK_WRONG' ? 'invalid' : payload.multiple_answer_policy),
      confidence_threshold: payload.confidence_threshold,
    };
    const res = await api.post<any>('/omr/exams', body);
    return { success: true, data: unwrapOmr<OmrExam>(res) };
  },

  async getAnswerKey(examId: string): Promise<{ success: boolean; data: OmrAnswerKey | null }> {
    try {
      const res = await api.get<any>(`/omr/exams/${examId}/answer-key`);
      return { success: true, data: unwrapOmr(res) || null };
    } catch {
      return { success: true, data: null };
    }
  },

  async saveAnswerKey(payload: {
    exam_id: string;
    questions?: OmrAnswerKeyQuestion[];
    bulkText?: string;
    change_reason?: string;
    publish_immediately?: boolean;
  }): Promise<{ success: boolean; data: OmrAnswerKey }> {
    const res = await api.post<any>(`/omr/exams/${payload.exam_id}/answer-key`, payload);
    return { success: true, data: unwrapOmr(res) };
  },

  async publishAnswerKey(examId: string, version?: number): Promise<{ success: boolean; message: string }> {
    return await api.post(`/omr/exams/${examId}/answer-key/publish`, { version });
  },

  async scanMasterSheet(payload: {
    exam_id: string;
    image_base64: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: {
      detected_key: Record<number, string>;
    };
  }> {
    return await api.post<any>(`/omr/exams/${payload.exam_id}/answer-key/scan`, {
      imageBase64: payload.image_base64,
    });
  },

  async getScans(params?: {
    exam_id?: string;
    batch_id?: string;
    status?: string;
    limit?: number;
  }): Promise<{ success: boolean; data: OmrScan[] }> {
    const query = params?.exam_id ? `?exam_id=${params.exam_id}` : '';
    const res = await api.get<any>(`/omr/scans${query}`);
    return { success: true, data: unwrapOmrList<OmrScan>(res) };
  },

  async processScan(payload: {
    omr_exam_id: string;
    imageBase64: string;
    sheet_id?: string;
    client_scan_id?: string;
    batch_id?: string;
    qr_payload?: string;
    replace_existing?: boolean;
    device_id?: string;
  }): Promise<OmrScanResult> {
    const res = await api.post<any>('/omr/scan', payload, { silent: true });
    return unwrapOmr<OmrScanResult>(res);
  },

  async batchSyncScans(payload: {
    omr_exam_id: string;
    batch_id?: string;
    scans: any[];
  }): Promise<{ success: boolean; processed: number; data: any[] }> {
    const res = await api.post<any>('/omr/batch-scan', payload, { silent: true });
    if (res && typeof res === 'object' && 'processed' in res) return res;
    return { success: true, processed: Array.isArray(res) ? res.length : 0, data: Array.isArray(res) ? res : unwrapOmrList(res) };
  },

  async getExceptions(params?: {
    exam_id?: string;
    status?: string;
  }): Promise<{ success: boolean; data: any[] }> {
    const query = params?.exam_id ? `?omr_exam_id=${params.exam_id}` : '';
    const res = await api.get<any>(`/omr/exceptions${query}`);
    return { success: true, data: unwrapOmrList(res) };
  },

  async overrideAnswer(scanId: string, payload: {
    question_number: number;
    new_option: string | null;
    reason?: string;
  }): Promise<{ success: boolean; data: OmrScan }> {
    const res = await api.post<any>(`/omr/scans/${scanId}/override`, {
      question_number: payload.question_number,
      override_option: payload.new_option,
      reason: payload.reason,
    });
    return { success: true, data: unwrapOmr<OmrScan>(res) || (res as OmrScan) };
  },

  async finalizeExam(omrExamId: string, options?: { allow_unverified_override?: boolean }): Promise<{
    success: boolean;
    message: string;
    data: {
      exam_id: string;
      scans_finalized: number;
      marks_posted: number;
    };
  }> {
    const res = await api.post<any>(`/omr/exams/${omrExamId}/finalize`, options || {});
    if (res && res.message) return res;
    return { success: true, message: 'Finalized', data: unwrapOmr(res) };
  },

  async getAnalytics(omrExamId: string): Promise<{ success: boolean; data: OmrAnalyticsReport | null }> {
    try {
      const res = await api.get<any>(`/omr/exams/${omrExamId}/analytics`);
      return { success: true, data: unwrapOmr(res) || null };
    } catch {
      return { success: true, data: null };
    }
  },

  async getAuditLogs(params?: { limit?: number }): Promise<{ success: boolean; data: OmrAuditLog[] }> {
    try {
      const res = await api.get<any>('/omr/audit');
      return { success: true, data: unwrapOmrList<OmrAuditLog>(res) };
    } catch {
      return { success: true, data: [] };
    }
  }
};

export const OmrService = omrService;

