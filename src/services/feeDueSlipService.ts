import { api, API_BASE_URL, getAccessToken } from './apiClient';
import type {
  DocumentTemplate,
  FeeDueStudentsResponse,
  DocumentGenerationJob,
} from '../types/documentTemplate';
import { SCHOOL_ID } from '../constants/school';

export const FeeDueSlipService = {
  /**
   * List all templates for current school.
   */
  async getTemplates(documentType = 'fee_due_slip'): Promise<DocumentTemplate[]> {
    const res = await api.get<{ templates: DocumentTemplate[] }>(
      '/api/v1/fee-due-slips/templates',
      { document_type: documentType }
    );
    return res.templates || [];
  },

  /**
   * Create a new document template.
   */
  async createTemplate(data: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const res = await api.post<{ template: DocumentTemplate }>(
      '/api/v1/fee-due-slips/templates',
      data
    );
    return res.template;
  },

  /**
   * Get single template by ID.
   */
  async getTemplate(id: string): Promise<DocumentTemplate> {
    const res = await api.get<{ template: DocumentTemplate }>(
      `/api/v1/fee-due-slips/templates/${id}`
    );
    return res.template;
  },

  /**
   * Update an existing template.
   */
  async updateTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const res = await api.put<{ template: DocumentTemplate }>(
      `/api/v1/fee-due-slips/templates/${id}`,
      data
    );
    return res.template;
  },

  /**
   * Delete / Archive a template.
   */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/api/v1/fee-due-slips/templates/${id}`);
  },

  /**
   * Duplicate a template.
   */
  async duplicateTemplate(id: string): Promise<DocumentTemplate> {
    const res = await api.post<{ template: DocumentTemplate }>(
      `/api/v1/fee-due-slips/templates/${id}/duplicate`
    );
    return res.template;
  },

  /**
   * Set template as school default.
   */
  async setDefaultTemplate(id: string): Promise<DocumentTemplate> {
    const res = await api.post<{ template: DocumentTemplate }>(
      `/api/v1/fee-due-slips/templates/${id}/default`
    );
    return res.template;
  },

  /**
   * Fetch filtered list of students with authoritative due calculation.
   */
  async getDueStudents(filters: Record<string, any> = {}): Promise<FeeDueStudentsResponse> {
    return await api.get<FeeDueStudentsResponse>(
      '/api/v1/fee-due-slips/students',
      filters
    );
  },

  /**
   * Preview a template with sample data OR a selected student.
   */
  async previewSlip(payload: {
    template_id?: string;
    template_name?: string;
    template_definition?: any;
    page_settings?: any;
    student_id?: string;
    academic_year_id?: string;
    use_sample_data?: boolean;
  }): Promise<{ html: string; resolved_data: any }> {
    return await api.post<{ html: string; resolved_data: any }>(
      '/api/v1/fee-due-slips/preview',
      payload
    );
  },

  /**
   * Generate slips (single or batch).
   */
  async generateSlips(payload: {
    template_id?: string;
    student_ids: string[];
    academic_year_id?: string;
    filters?: Record<string, any>;
    layout_mode?: number;
    output_format?: string;
  }): Promise<{
    job_id: string;
    status: string;
    progress: number;
    student_count: number;
    total_due_amount: number;
    html: string;
    students: any[];
    document_numbers: string[];
  }> {
    return await api.post(
      '/api/v1/fee-due-slips/generate',
      payload
    );
  },

  /**
   * Check status of an ongoing generation job.
   */
  async getJobStatus(jobId: string): Promise<DocumentGenerationJob> {
    const res = await api.get<{ job: DocumentGenerationJob }>(
      `/api/v1/fee-due-slips/jobs/${jobId}`
    );
    return res.job;
  },

  /**
   * Cancel an ongoing generation job.
   */
  async cancelJob(jobId: string): Promise<void> {
    await api.post(`/api/v1/fee-due-slips/jobs/${jobId}/cancel`);
  },

  /**
   * Fetch generation history and audit trail.
   */
  async getHistory(limit = 50): Promise<DocumentGenerationJob[]> {
    const res = await api.get<{ history: DocumentGenerationJob[] }>(
      '/api/v1/fee-due-slips/history',
      { limit }
    );
    return res.history || [];
  },

  /**
   * Download Excel roster of filtered due students.
   */
  async downloadExcel(filters: Record<string, any> = {}): Promise<Blob> {
    const token = await getAccessToken();
    const query = new URLSearchParams({
      ...filters,
      school_id: String(SCHOOL_ID),
    }).toString();

    const response = await fetch(`${API_BASE_URL}/api/v1/fee-due-slips/export/xlsx?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': String(SCHOOL_ID),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export Excel.');
    }
    return await response.blob();
  },

  /**
   * Download CSV export.
   */
  async downloadCsv(filters: Record<string, any> = {}): Promise<string> {
    const token = await getAccessToken();
    const query = new URLSearchParams({
      ...filters,
      school_id: String(SCHOOL_ID),
    }).toString();

    const response = await fetch(`${API_BASE_URL}/api/v1/fee-due-slips/export/csv?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': String(SCHOOL_ID),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to export CSV.');
    }
    return await response.text();
  },

  /**
   * Export Word DOCX format.
   */
  async exportDocx(payload: {
    template_id?: string;
    student_ids: string[];
    academic_year_id?: string;
  }): Promise<Blob> {
    const token = await getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/fee-due-slips/export/docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-School-Id': String(SCHOOL_ID),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to export DOCX.');
    }
    return await response.blob();
  },

  /**
   * Export class-partitioned ZIP bundle.
   */
  async exportZip(payload: {
    template_id?: string;
    student_ids: string[];
    academic_year_id?: string;
  }): Promise<Blob> {
    const token = await getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/fee-due-slips/export/zip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-School-Id': String(SCHOOL_ID),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to export ZIP.');
    }
    return await response.blob();
  },

  // Aliases for seamless developer ergonomics
  async fetchTemplates(documentType = 'fee_due_slip'): Promise<DocumentTemplate[]> {
    return this.getTemplates(documentType);
  },

  async fetchDueStudents(filters: Record<string, any> = {}): Promise<FeeDueStudentsResponse> {
    return this.getDueStudents(filters);
  },

  async fetchJobHistory(limit = 50): Promise<DocumentGenerationJob[]> {
    return this.getHistory(limit);
  },

  async previewHtml(templateId?: string, options: { student_id?: string; student_ids?: string[] } = {}): Promise<string> {
    const res = await this.previewSlip({
      template_id: templateId,
      student_id: options.student_id || (options.student_ids?.[0]),
      use_sample_data: !options.student_id && (!options.student_ids || options.student_ids.length === 0),
    });
    return res.html;
  },

  async startBatchJob(payload: {
    template_id?: string;
    format?: string;
    student_ids?: string[];
    filters?: Record<string, any>;
  }): Promise<{ job_id: string; total_records: number }> {
    const res = await this.generateSlips({
      template_id: payload.template_id,
      student_ids: payload.student_ids || [],
      filters: payload.filters,
      output_format: payload.format || 'pdf',
    });
    return {
      job_id: res.job_id,
      total_records: res.student_count,
    };
  },

  async pollBatchJob(jobId: string): Promise<DocumentGenerationJob & { processed_records?: number; total_records?: number }> {
    const job = await this.getJobStatus(jobId);
    return {
      ...job,
      processed_records: job.student_count,
      total_records: job.student_count,
    };
  },

  async cancelBatchJob(jobId: string): Promise<void> {
    return this.cancelJob(jobId);
  },

  async saveTemplate(data: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    if (data.id) {
      return this.updateTemplate(data.id, data);
    }
    return this.createTemplate(data);
  },

  async downloadBatchResult(jobId: string, format: 'pdf' | 'zip' = 'pdf'): Promise<Blob> {
    if (format === 'zip') {
      return this.exportZip({ template_id: undefined, student_ids: [] });
    }
    const token = await getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/fee-due-slips/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': String(SCHOOL_ID),
      },
    });
    return await response.blob();
  },
};

export const feeDueSlipService = FeeDueSlipService;
