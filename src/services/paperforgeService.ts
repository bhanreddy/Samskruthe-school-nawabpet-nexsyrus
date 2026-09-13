import { api } from './apiClient';

export type QuestionType = 'MCQ' | 'VSA' | 'SA' | 'LA';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type BloomLevel = 'KNOWLEDGE' | 'UNDERSTANDING' | 'APPLICATION' | 'ANALYSIS' | 'EVALUATION' | 'CREATION';

export interface BlueprintSection {
  subject: string;
  chapters: string[];
  question_type: QuestionType;
  count: number;
  marks_per_question: number;
  bloom_target: BloomLevel;
  difficulty: DifficultyLevel;
  topic?: string | null;
}

export interface Blueprint {
  blueprint_id?: string;
  class_level: string;
  board?: string;
  tolerance_pct?: number;
  language?: string;
  sections: BlueprintSection[];
}

export interface GeneratedQuestion {
  question_type: QuestionType;
  bloom_level: BloomLevel;
  difficulty: DifficultyLevel;
  marks: number;
  question_text: string;
  correct_answer: string;
  options?: string[] | null;
  answer_explanation?: string;
  solution_steps?: string[] | null;
  chapter?: string | null;
  topic?: string | null;
  verification_status?: string;
}

export interface GeneratedPaperRecord {
  id: string;
  paper_id?: string | null;
  subject: string;
  class_level: string;
  exam_name?: string | null;
  title?: string | null;
  blueprint: Blueprint;
  questions: GeneratedQuestion[];
  question_count?: number;
  compliance?: any;
  status: 'CONFIGURING' | 'GENERATING' | 'READY' | 'FAILED';
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

export const PaperForgeService = {
  async listPapers(params?: { limit?: number; offset?: number }): Promise<GeneratedPaperRecord[]> {
    const res = await api.get<GeneratedPaperRecord[]>('/paperforge/papers', params, { silent: true });
    return Array.isArray(res) ? res : [];
  },

  async getPaper(id: string): Promise<GeneratedPaperRecord | null> {
    const res = await api.get<GeneratedPaperRecord>(`/paperforge/papers/${id}`, undefined, { silent: true });
    return res || null;
  },

  async generatePaper(payload: {
    subject: string;
    class_level: string;
    exam_name?: string;
    title?: string;
    blueprint: Blueprint;
  }): Promise<GeneratedPaperRecord> {
    return api.post<GeneratedPaperRecord>('/paperforge/generate', payload);
  },

  async updatePaper(id: string, payload: {
    questions?: GeneratedQuestion[];
    title?: string;
    exam_name?: string;
  }): Promise<GeneratedPaperRecord> {
    return api.put<GeneratedPaperRecord>(`/paperforge/papers/${id}`, payload);
  },

  async exportPaper(paperId: string, format: 'pdf' | 'docx' = 'pdf'): Promise<void> {
    const extension = format === 'docx' ? 'docx' : 'pdf';
    return api.downloadFile(
      `/paperforge/export/${encodeURIComponent(paperId)}?format=${format}`,
      `question-paper.${extension}`,
    );
  },
};
