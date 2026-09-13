export interface LoginQrSchool {
  id: number;
  name: string;
  logo_url: string | null;
}

export interface LoginQrAcademicYear {
  id: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

export interface LoginQrClassSection {
  id: string;
  academic_year_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
}

export interface LoginQrMetadata {
  school: LoginQrSchool | null;
  academicYears: LoginQrAcademicYear[];
  classSections: LoginQrClassSection[];
}

export interface LoginQrStudent {
  id: string;
  name: string;
  admission_no: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  academic_year_id: string;
  login_email: string | null;
  login_configured: boolean;
  qr_ready: boolean;
  qr_expires_at: string | null;
}

export interface IssuedLoginQr {
  qrPayload: string;
  credentialId: string;
  expiresAt: string;
  created: boolean;
  student: {
    id: string;
    name: string;
    admissionNo: string;
    className: string | null;
    sectionName: string | null;
  };
}

export interface LoginQrStudentPage {
  rows: LoginQrStudent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
