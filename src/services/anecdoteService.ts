import { apiClient } from './apiClient';

export interface AnecdoteCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  subcategories: AnecdoteSubcategory[];
}

export interface AnecdoteSubcategory {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description?: string;
}

export interface AnecdoteEvidence {
  id: string;
  evidence_type: 'photo' | 'document' | 'note' | 'url' | 'record_reference';
  file_url?: string;
  file_name?: string;
  mime_type?: string;
}

export interface AnecdoteFollowUp {
  id: string;
  due_date: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  assigned_to_name?: string;
  completed_at?: string;
}

export interface Anecdote {
  id: string;
  student_id: string;
  student_name?: string;
  student_photo_url?: string;
  admission_no?: string;
  student_admission_no?: string;
  title?: string;
  observation_text: string;
  context: 'classroom' | 'playground' | 'laboratory' | 'corridor' | 'sports_field' | 'bus' | 'cafeteria' | 'assembly' | 'online' | 'other';
  observation_type: 'OBSERVATION' | 'RECOGNITION' | 'IMPROVEMENT' | 'CONCERN' | 'INCIDENT' | 'ACHIEVEMENT';
  category_id?: string;
  category_name?: string;
  category_code?: string;
  category_color?: string;
  category_icon?: string;
  subcategory_id?: string;
  subcategory_name?: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'ATTENTION' | 'CONCERN' | 'ACHIEVEMENT';
  severity: 'LEVEL_0_INFORMATIONAL' | 'LEVEL_1_POSITIVE' | 'LEVEL_2_WATCH' | 'LEVEL_3_ATTENTION' | 'LEVEL_4_CRITICAL';
  visibility: 'STAFF_ONLY' | 'COORDINATOR_ONLY' | 'SCHOOL_ADMIN' | 'PARENT_VISIBLE' | 'STUDENT_VISIBLE';
  status: string;
  inferred_metadata?: {
    suggested_skills?: string[];
    matched_keywords?: string[];
    confidence?: 'LOW' | 'MODERATE' | 'HIGH';
  };
  observed_at: string;
  created_at: string;
  created_by_name?: string;
  evidence?: AnecdoteEvidence[];
  followups?: AnecdoteFollowUp[];
  tags?: string[];
}

export type ObservationCategory = AnecdoteCategory;
export type InferredAnecdote = InferredTaxonomy & { skills?: string[]; [key: string]: any };
export type TimelineItem = any;

export interface InferredTaxonomy {
  category_code: string;
  subcategory_code: string;
  observation_type: string;
  sentiment: string;
  severity: string;
  context: string;
  suggested_skills: string[];
  matched_keywords: string[];
  confidence: 'LOW' | 'MODERATE' | 'HIGH';
}

export const AnecdoteService = {
  /**
   * Fetch taxonomy categories and subcategories
   */
  async getTaxonomy(): Promise<{ categories: AnecdoteCategory[] }> {
    return apiClient.get('/anecdotes/taxonomy');
  },

  /**
   * Pre-infer taxonomy tokens from teacher text
   */
  async inferTaxonomy(text: string): Promise<InferredTaxonomy> {
    return apiClient.post('/anecdotes/infer', { text });
  },

  async inferAnecdote(text: string): Promise<InferredAnecdote> {
    return this.inferTaxonomy(text);
  },

  /**
   * List anecdotes with filtering & pagination
   */
  async getAnecdotes(params: {
    student_id?: string;
    class_section_id?: string;
    category_id?: string;
    observation_type?: string;
    sentiment?: string;
    severity?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    items: Anecdote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.student_id) query.set('student_id', params.student_id);
    if (params.class_section_id) query.set('class_section_id', params.class_section_id);
    if (params.category_id) query.set('category_id', params.category_id);
    if (params.observation_type) query.set('observation_type', params.observation_type);
    if (params.sentiment) query.set('sentiment', params.sentiment);
    if (params.severity) query.set('severity', params.severity);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return apiClient.get(`/anecdotes${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get observation details
   */
  async getAnecdoteById(id: string): Promise<Anecdote> {
    return apiClient.get(`/anecdotes/${id}`);
  },

  /**
   * Create an observation
   */
  async createAnecdote(payload: {
    student_id: string;
    class_section_id?: string;
    title?: string;
    observation_text: string;
    context?: string;
    observation_type?: string;
    category_id?: string;
    subcategory_id?: string;
    sentiment?: string;
    severity?: string;
    visibility?: string;
    status?: string;
    observed_at?: string;
    client_generated_id?: string;
    tags?: string[];
  }): Promise<Anecdote> {
    return apiClient.post('/anecdotes', payload);
  },

  /**
   * Update an observation
   */
  async updateAnecdote(id: string, updates: Partial<Anecdote>): Promise<Anecdote> {
    return apiClient.patch(`/anecdotes/${id}`, updates);
  },

  /**
   * Archive an observation
   */
  async archiveAnecdote(id: string): Promise<{ success: boolean; id: string }> {
    return apiClient.delete(`/anecdotes/${id}`);
  },

  /**
   * Schedule a follow-up
   */
  async createFollowUp(anecdoteId: string, payload: {
    due_date: string;
    notes?: string;
    assigned_to_user_id?: string;
  }): Promise<AnecdoteFollowUp> {
    return apiClient.post(`/anecdotes/${anecdoteId}/followups`, payload);
  },

  async completeFollowUp(anecdoteId: string, followUpId: string, notes?: string): Promise<AnecdoteFollowUp> {
    return apiClient.patch(`/anecdotes/${anecdoteId}/followups/${followUpId}`, { notes });
  },

  /**
   * Attach evidence via multipart
   */
  async uploadEvidence(anecdoteId: string, formData: FormData): Promise<AnecdoteEvidence> {
    return apiClient.uploadFormData(`/anecdotes/${anecdoteId}/evidence`, formData);
  },

  /**
   * Student timeline
   */
  async getStudentTimeline(studentId: string, page = 1, limit = 20, filter = 'ALL'): Promise<{
    items: any[];
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    return apiClient.get(`/intelligence/students/${studentId}/timeline?page=${page}&limit=${limit}&filter=${filter}`);
  },
};
