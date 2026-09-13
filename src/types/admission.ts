export type WorkflowStatus =
  | 'ENQUIRY_CREATED'
  | 'APPLICATION_STARTED'
  | 'APPLICATION_INCOMPLETE'
  | 'APPLICATION_SUBMITTED'
  | 'DOCUMENT_COLLECTION'
  | 'DOCUMENT_VERIFICATION'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFICATION_COMPLETED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'TEST_SCHEDULED'
  | 'TEST_COMPLETED'
  | 'APPLICATION_UNDER_REVIEW'
  | 'APPROVED'
  | 'WAITLISTED'
  | 'CONDITIONALLY_APPROVED'
  | 'FEE_PENDING'
  | 'FEE_PAID'
  | 'ADMISSION_CONFIRMED'
  | 'CONVERTED_TO_STUDENT'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';

export interface WorkflowStage {
  id: string;
  code: string;
  name: string;
  description?: string;
  sequence_order: number;
  is_mandatory: boolean;
  is_active: boolean;
  requires_approval: boolean;
  requires_documents: boolean;
  requires_interview: boolean;
  requires_test: boolean;
  requires_fee: boolean;
  responsible_role: string;
  sla_hours: number;
  color: string;
}

export interface DocumentRequirement {
  id: string;
  document_type: string;
  display_name: string;
  description?: string;
  is_mandatory: boolean;
  applicable_classes?: string[];
  allowed_extensions: string[];
  max_size_mb: number;
}

export interface UploadedAdmissionDocument {
  id: string;
  document_type: string;
  title: string;
  file_name?: string;
  file_url: string;
  file_size_bytes?: number;
  mime_type?: string;
  status: 'PENDING' | 'UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'REUPLOAD_REQUIRED' | 'EXPIRED';
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  replacement_requested?: boolean;
  version: number;
  updated_at: string;
}

export interface DocumentChecklistItem {
  documentType: string;
  displayName: string;
  title?: string;
  description?: string;
  isMandatory: boolean;
  allowedExtensions: string[];
  maxSizeMb: number;
  uploadedDoc: UploadedAdmissionDocument | null;
  document?: UploadedAdmissionDocument | null;
  status: string;
}

export interface DocumentChecklistSummary {
  checklist: DocumentChecklistItem[];
  mandatoryCount: number;
  verifiedCount: number;
  verifiedDocuments?: number;
  requiredDocuments?: number;
  pendingDocuments?: number;
  rejectedCount: number;
  isFullyCompliant: boolean;
  uploadedDocuments: UploadedAdmissionDocument[];
}

export interface AdmissionApplication {
  id: string;
  school_id: number;
  application_no: string;
  application_number?: string;
  parent_phone?: string;
  parent_email?: string;
  converted_admission_no?: string;
  decision_status?: string;
  enquiry_id?: string;
  applicant_user_id?: string;
  status: WorkflowStatus;
  current_stage_id?: string;
  current_stage_name?: string;
  current_stage_code?: string;
  stage_color?: string;

  // Student Details
  student_first_name: string;
  student_middle_name?: string;
  student_last_name?: string;
  dob?: string;
  gender_id?: number;
  gender_name?: string;
  blood_group_id?: number;
  blood_group_name?: string;
  religion_id?: number;
  religion_name?: string;
  category_id?: number;
  category_name?: string;
  nationality_code?: string;
  aadhaar_number?: string;
  student_photo_url?: string;

  // Academic Placement
  applying_class_id: string;
  class_name?: string;
  academic_year_id: string;
  academic_year_name?: string;
  assigned_section_id?: string;
  section_name?: string;

  // Parent / Guardian
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_relation?: string;
  primary_contact: 'father' | 'mother' | 'guardian';

  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Previous School
  has_previous_school?: boolean;
  previous_school_name?: string;
  previous_board?: string;
  previous_class?: string;
  previous_academic_year?: string;
  tc_number?: string;

  // Logistics
  transport_required?: boolean;
  pickup_location?: string;
  preferred_route?: string;
  hostel_required?: boolean;
  sibling_studying_here?: boolean;
  sibling_name?: string;
  sibling_class?: string;
  sibling_admission_no?: string;
  medical_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Evaluation & Decision
  custom_data?: Record<string, any>;
  source: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  scoring_breakdown?: Record<string, any>;
  total_score: number;
  decision: 'PENDING' | 'APPROVED' | 'CONDITIONALLY_APPROVED' | 'WAITLISTED' | 'REJECTED';
  decision_reason?: string;
  conditional_requirements?: string;
  decision_by?: string;
  decision_at?: string;
  waitlist_rank?: number;

  // SLA & Timestamps
  sla_due_at?: string;
  is_sla_breached: boolean;
  submitted_at?: string;
  completed_at?: string;

  // Conversion
  converted_student_id?: string;
  converted_at?: string;
  converted_by?: string;

  created_at: string;
  updated_at: string;
}

export interface AdmissionTask {
  id: string;
  application_id: string;
  application_no?: string;
  student_first_name?: string;
  student_last_name?: string;
  title: string;
  description?: string;
  task_type: string;
  assigned_role: string;
  assigned_to?: string;
  assigned_user_name?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
  due_at?: string;
  is_sla_breached: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
}

export interface AdmissionInterview {
  id: string;
  application_id: string;
  application_no?: string;
  student_first_name?: string;
  student_last_name?: string;
  interview_type: 'INTERVIEW' | 'ENTRANCE_TEST' | 'INTERACTION';
  title: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  location: string;
  mode: 'OFFLINE' | 'ONLINE';
  online_meeting_url?: string;
  interviewer_id?: string;
  interviewer_name?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'ABSENT';
  rubric_scores?: {
    communication?: number;
    confidence?: number;
    academic_readiness?: number;
    behaviour?: number;
  };
  total_score?: number;
  recommendation?: 'APPROVE' | 'WAITLIST' | 'REJECT' | 'REVIEW_FURTHER';
  feedback?: string;
  created_at: string;
}

export interface AdmissionNote {
  id: string;
  application_id: string;
  author_id: string;
  author_name?: string;
  note: string;
  priority: 'NORMAL' | 'HIGH' | 'FLAG';
  is_private: boolean;
  created_at: string;
}

export interface AdmissionCommunication {
  id: string;
  application_id: string;
  sender_type: 'STAFF' | 'SYSTEM' | 'APPLICANT';
  message_type: string;
  subject: string;
  message: string;
  channels: string[];
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface AdmissionAuditLog {
  id: string;
  application_id: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  from_state?: string;
  to_state?: string;
  reason?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface SmartNextAction {
  type: 'ACTION_REQUIRED' | 'NO_ACTION_REQUIRED' | 'COMPLETED';
  title: string;
  description: string;
  actionKey?: string;
  targetDocType?: string;
  deadline?: string;
}

export interface AdmissionAnalyticsData {
  funnel: {
    totalEnquiries: number;
    newEnquiries: number;
    totalApplications: number;
    draftApplications: number;
    submittedApplications: number;
    verificationPending: number;
    interviewsScheduled: number;
    underReview: number;
    approvedApplications: number;
    waitlistedApplications: number;
    convertedStudents: number;
    rejectedApplications: number;
    withdrawnApplications: number;
    slaBreachedCount: number;
    enquiryToApplicationRate: number;
    applicationToAdmissionRate: number;
    enquiries?: number;
    applications?: number;
    verified?: number;
    interviewed?: number;
    approved?: number;
    converted?: number;
  };
  sources: Array<{ source: string; count: number }>;
  sourceBreakdown?: Array<{ source: string; count: number; converted?: number; conversionRate?: number }>;
  conversionRate?: number;
  averageTurnaroundDays?: number;
  slaCompliance?: {
    complianceRate: number;
    breachedTasks: number;
  };
  classCapacity: Array<{
    classId: string;
    className: string;
    totalCapacity: number;
    confirmedStudents: number;
    approvedSeats: number;
    availableSeats: number;
    activeApplications: number;
    waitlistedCount: number;
    utilizationPct: number;
  }>;
  insights?: string[];
}
