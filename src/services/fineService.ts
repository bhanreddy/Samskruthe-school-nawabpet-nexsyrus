import { api } from './apiClient';
import type {
  Fine,
  FineCategory,
  FinePolicy,
  FineStats,
  FineWaiver,
  FineDispute,
  FinePayment,
  FineAgingReport,
  FineCategoryReportItem,
  CreateFinePayload,
  CreateFineWaiverPayload,
  RecordFinePaymentPayload,
  CreateFineDisputePayload,
  ResolveFineDisputePayload,
} from '../types/fines';

export interface FineListParams {
  status?: string;
  student_id?: string;
  category_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
  class_id?: string;
  academic_year_id?: string;
}

export interface FineListResponse {
  data: Fine[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface FineDisputeListResponse {
  data: FineDispute[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface FineWaiverListResponse {
  data: FineWaiver[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface FineDetailResponse extends Fine {
  waivers: FineWaiver[];
  disputes: FineDispute[];
  payments: FinePayment[];
  attachments?: Array<{ id: string; file_name: string; file_url: string; file_type?: string }>;
  audit_logs?: Array<{
    id: string;
    action: string;
    details?: Record<string, unknown> | null;
    user_name?: string | null;
    created_at: string;
  }>;
}

export const FineService = {
  listFines: async (params?: FineListParams): Promise<FineListResponse> => {
    return api.get<FineListResponse>('/fines', params);
  },

  getStats: async (academicYearId?: string): Promise<FineStats> => {
    return api.get<FineStats>('/fines/stats', academicYearId ? { academic_year_id: academicYearId } : undefined);
  },

  getCategories: async (activeOnly?: boolean): Promise<FineCategory[]> => {
    return api.get<FineCategory[]>('/fines/categories', activeOnly ? { active: true } : undefined);
  },

  createCategory: async (data: Partial<FineCategory>): Promise<FineCategory> => {
    return api.post<FineCategory>('/fines/categories', data);
  },

  updateCategory: async (id: string, data: Partial<FineCategory>): Promise<FineCategory> => {
    return api.patch<FineCategory>(`/fines/categories/${id}`, data);
  },

  getPolicies: async (params?: { category_id?: string; active?: boolean }): Promise<FinePolicy[]> => {
    return api.get<FinePolicy[]>('/fines/policies', params);
  },

  createPolicy: async (data: Partial<FinePolicy>): Promise<FinePolicy> => {
    return api.post<FinePolicy>('/fines/policies', data);
  },

  updatePolicy: async (id: string, data: Partial<FinePolicy>): Promise<FinePolicy> => {
    return api.patch<FinePolicy>(`/fines/policies/${id}`, data);
  },

  getFineById: async (id: string): Promise<FineDetailResponse> => {
    return api.get<FineDetailResponse>(`/fines/${id}`);
  },

  getStudentFines: async (studentId: string): Promise<{ active: Fine[]; history: Fine[] }> => {
    return api.get<{ active: Fine[]; history: Fine[] }>(`/fines/student/${studentId}`);
  },

  createFine: async (payload: CreateFinePayload): Promise<Fine> => {
    return api.post<Fine>('/fines', payload);
  },

  requestFine: async (payload: CreateFinePayload): Promise<Fine> => {
    return api.post<Fine>('/fines/request', payload);
  },

  approveFine: async (id: string, options?: { approved_amount?: number; review_note?: string }): Promise<Fine> => {
    return api.post<Fine>(`/fines/${id}/approve`, options);
  },

  rejectFine: async (id: string, rejectionReason: string): Promise<Fine> => {
    return api.post<Fine>(`/fines/${id}/reject`, { rejection_reason: rejectionReason });
  },

  requestClarification: async (id: string, message: string): Promise<Fine> => {
    return api.post<Fine>(`/fines/${id}/clarify`, { message });
  },

  cancelFine: async (id: string, cancellationReason: string): Promise<Fine> => {
    return api.post<Fine>(`/fines/${id}/cancel`, { cancellation_reason: cancellationReason });
  },

  waiveFine: async (id: string, payload: CreateFineWaiverPayload): Promise<{ fine: Fine; waiver: FineWaiver }> => {
    return api.post<{ fine: Fine; waiver: FineWaiver }>(`/fines/${id}/waive`, payload);
  },

  recordPayment: async (id: string, payload: RecordFinePaymentPayload): Promise<{ fine: Fine; payment: FinePayment; receipt_no: string }> => {
    return api.post<{ fine: Fine; payment: FinePayment; receipt_no: string }>(`/fines/${id}/pay`, payload);
  },

  disputeFine: async (id: string, payload: CreateFineDisputePayload): Promise<FineDispute> => {
    return api.post<FineDispute>(`/fines/${id}/dispute`, payload);
  },

  listDisputes: async (params?: { status?: string; page?: number; limit?: number }): Promise<FineDisputeListResponse> => {
    return api.get<FineDisputeListResponse>('/fines/disputes', params);
  },

  resolveDispute: async (disputeId: string, payload: ResolveFineDisputePayload): Promise<{ dispute_id: string; status: string }> => {
    return api.post<{ dispute_id: string; status: string }>(`/fines/disputes/${disputeId}/resolve`, payload);
  },

  listWaivers: async (params?: { page?: number; limit?: number }): Promise<FineWaiverListResponse> => {
    return api.get<FineWaiverListResponse>('/fines/waivers', params);
  },

  getAgingReport: async (): Promise<FineAgingReport> => {
    return api.get<FineAgingReport>('/fines/reports/aging');
  },

  getCategoryReport: async (): Promise<FineCategoryReportItem[]> => {
    return api.get<FineCategoryReportItem[]>('/fines/reports/categories');
  },

  exportFines: async (): Promise<void> => {
    return api.downloadFile('/fines/export', `fines-and-adjustments.xlsx`);
  },
};
