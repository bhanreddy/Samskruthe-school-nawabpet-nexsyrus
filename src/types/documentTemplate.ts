export type TemplateBlockType =
  | 'header'
  | 'student_details'
  | 'fee_summary'
  | 'fee_table'
  | 'payment_instructions'
  | 'tear_off_slip'
  | 'custom_text'
  | 'qr_code'
  | 'divider'
  | 'spacer'
  | 'signature';

export interface TemplateBlockField {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}

export interface TemplateBlockSignature {
  label: string;
  width?: string;
}

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  content?: string;
  notice_text?: string;
  due_date_label?: string;
  show_logo?: boolean;
  show_school_details?: boolean;
  show_document_number?: boolean;
  show_date?: boolean;
  show_due_in_words?: boolean;
  show_scissors?: boolean;
  show_upi_qr?: boolean;
  layout?: 'grid_2_col' | 'stacked' | 'table';
  fields?: TemplateBlockField[];
  signatures?: TemplateBlockSignature[];
  thickness?: string;
  style?: string;
  height?: string;
  font_size?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TemplatePageSettings {
  page_size: 'A4' | 'A5' | 'A6';
  orientation: 'portrait' | 'landscape';
  slips_per_page: 1 | 2 | 4;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  show_border?: boolean;
  border_style?: 'solid' | 'double' | 'dashed';
  border_color?: string;
  font_family?: string;
  primary_color?: string;
  accent_color?: string;
}

export interface TemplateDefinition {
  version: number;
  blocks: TemplateBlock[];
}

export interface DocumentTemplate {
  id: string;
  school_id: number;
  name: string;
  document_type: string;
  description?: string | null;
  template_definition: TemplateDefinition;
  page_settings: TemplatePageSettings;
  is_default: boolean;
  status: 'active' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface DueStudentItem {
  student_id: string;
  admission_no: string;
  student_name: string;
  photo_url?: string | null;
  class_id?: string;
  class_name: string;
  section_id?: string;
  section_name: string;
  roll_number?: string | number | null;
  village?: string;
  route_name?: string;
  father_name: string;
  mother_name?: string;
  contact_number?: string;
  total_fee: number;
  concession_amount: number;
  paid_amount: number;
  tuition_due: number;
  transport_due: number;
  fine_due: number;
  due_amount: number;
  earliest_due_date?: string | null;
  is_overdue: boolean;
  overdue_days: number;
  status: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Advance' | 'All';
  academic_year: string;
}

export interface FeeDueSummary {
  total_students: number;
  total_fee: number;
  total_concession: number;
  total_paid: number;
  total_due: number;
  total_transport_pending: number;
}

export interface FeeDueStudentsResponse {
  academic_year: {
    id: string;
    code: string;
    name?: string | null;
  } | null;
  summary: FeeDueSummary;
  students: DueStudentItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface DocumentGenerationJob {
  id: string;
  school_id: number;
  template_id?: string | null;
  document_type: string;
  filters: Record<string, any>;
  student_count: number;
  total_due_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  output_format: string;
  created_at: string;
  completed_at?: string | null;
  template_name?: string | null;
  created_by_name?: string | null;
}
