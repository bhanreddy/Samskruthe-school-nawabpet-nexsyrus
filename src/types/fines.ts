export type FineCalculationType = 'FIXED' | 'PER_DAY' | 'PERCENTAGE' | 'VARIABLE';

export type FineStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'POSTED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'WAIVED'
  | 'PARTIALLY_WAIVED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'DISPUTED';

export type FineApplicableModule =
  | 'GENERAL'
  | 'FEE_INVOICE'
  | 'LIBRARY'
  | 'TRANSPORT'
  | 'HOSTEL'
  | 'DISCIPLINE'
  | 'ID_CARD';

export interface FineCategory {
  id: string;
  school_id: number;
  name: string;
  code: string;
  description?: string | null;
  active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface FinePolicy {
  id: string;
  school_id: number;
  category_id: string;
  category_name?: string;
  category_code?: string;
  name: string;
  description?: string | null;
  calculation_type: FineCalculationType;
  fixed_amount?: number | null;
  per_day_amount?: number | null;
  percentage?: number | null;
  minimum_amount?: number | null;
  maximum_amount?: number | null;
  grace_days: number;
  auto_apply: boolean;
  approval_required: boolean;
  approval_threshold_amount?: number | null;
  applicable_module: FineApplicableModule;
  effective_from?: string | null;
  effective_until?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FineCalculationBreakdown {
  calculation_type: FineCalculationType | string;
  rate?: number | null;
  days_overdue?: number;
  fineable_days?: number;
  grace_days?: number;
  due_date?: string;
  as_of_date?: string;
  base_amount?: number;
  formula?: string;
  capped_at_max?: boolean;
  max_cap?: number;
  raised_to_min?: boolean;
  min_floor?: number;
}

export interface Fine {
  id: string;
  school_id: number;
  fine_no: string;
  student_id: string;
  student_name?: string;
  admission_no?: string;
  student_admission_no?: string;
  class_name?: string;
  section_name?: string;
  category_id: string;
  category_name?: string;
  category_code?: string;
  policy_id?: string | null;
  policy_name?: string | null;
  source_type?: string;
  source_id?: string | null;
  reason?: string | null;
  internal_note?: string | null;
  calculation_details?: FineCalculationBreakdown | null;
  requested_amount: number;
  approved_amount: number;
  original_amount: number;
  adjustment_amount?: number;
  waived_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: FineStatus;
  created_by_name?: string | null;
  requested_by_name?: string | null;
  approved_by_name?: string | null;
  created_at: string;
  posted_at?: string | null;
  paid_at?: string | null;
  approved_at?: string | null;
  updated_at?: string;
  cancellation_reason?: string | null;
}

export interface FineWaiver {
  id: string;
  fine_id: string;
  fine_no?: string;
  student_name?: string;
  student_admission_no?: string;
  category_name?: string;
  amount: number;
  reason: string;
  notes?: string | null;
  receipt_no?: string | null;
  waived_by_name?: string | null;
  approved_by_name?: string | null;
  created_at: string;
}

export interface FineDispute {
  id: string;
  fine_id: string;
  fine_no?: string;
  student_id: string;
  student_name?: string;
  student_admission_no?: string;
  category_name?: string;
  outstanding_amount?: number;
  reason?: string;
  reason_type?: string;
  message?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED';
  resolution_note?: string | null;
  resolution_action?: string | null;
  parent_name?: string | null;
  submitted_by_name?: string | null;
  reviewed_by_name?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface FinePayment {
  id: string;
  fine_id: string;
  receipt_id?: string | null;
  receipt_no: string;
  amount: number;
  payment_method: string;
  transaction_ref?: string | null;
  paid_at: string;
  received_by_name?: string | null;
  remarks?: string | null;
}

export interface FineStats {
  total_generated: number;
  total_collected: number;
  total_outstanding: number;
  total_waived: number;
  pending_approvals_count: number;
  active_disputes_count: number;
  cancelled_count: number;
  total_fines_count: number;
  collection_percentage: number;
}

export interface AgingBucket {
  label?: string;
  count: number;
  total_amount?: number;
  outstanding_amount?: number;
  items?: Fine[];
}

export interface FineAgingReport {
  '0_30': AgingBucket;
  '31_60': AgingBucket;
  '61_90': AgingBucket;
  '90_plus': AgingBucket;
}

export interface FineCategoryReportItem {
  category_id: string;
  category_name: string;
  category_code: string;
  fines_count?: number;
  fine_count?: number;
  total_generated?: number;
  total_collected?: number;
  total_outstanding?: number;
  total_waived?: number;
}

export interface CreateFinePayload {
  student_id: string;
  category_id: string;
  policy_id?: string | null;
  amount?: number;
  reason: string;
  internal_note?: string | null;
  source_type?: string;
  source_id?: string | null;
  send_notification?: boolean;
  confirm_duplicate?: boolean;
  attachments?: Array<{ file_name?: string; file_url: string; file_type?: string; file_size?: number }>;
}

export interface CreateFineWaiverPayload {
  amount: number;
  reason: string;
  notes?: string;
}

export interface RecordFinePaymentPayload {
  amount: number;
  payment_method: string;
  transaction_ref?: string;
  remarks?: string;
}

export interface CreateFineDisputePayload {
  reason_type: string;
  message: string;
  student_id?: string;
}

export interface ResolveFineDisputePayload {
  resolution_action: 'WAIVED' | 'CANCELLED' | 'DISMISSED';
  resolution_note?: string;
  waiver_amount?: number;
  waiver_reason?: string;
}

export const FINE_STATUS_LABELS: Record<FineStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  POSTED: 'Outstanding',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  WAIVED: 'Waived',
  PARTIALLY_WAIVED: 'Partially Waived',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  DISPUTED: 'Under Review',
};

export const WAIVER_REASONS = [
  'Management Decision',
  'Financial Hardship',
  'Administrative Adjustment',
  'Special Approval',
  'Policy Exception',
  'Other',
] as const;

export const DISPUTE_REASONS = [
  'Incorrect Amount',
  'Incorrect Student',
  'Fine Already Paid',
  'Item Was Returned',
  'Fine Does Not Apply',
  'Other',
] as const;
